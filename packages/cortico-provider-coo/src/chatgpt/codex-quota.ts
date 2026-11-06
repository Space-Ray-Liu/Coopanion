/** Read-only Codex app-server adapter. Uses Codex's own login without reading credential files. */
import { spawn } from 'node:child_process';

export interface CodexQuotaWindow {
  bucket: string;
  minutes: number;
  usedPercent: number;
  remainingPercent: number;
  resetsAt: number | null;
}
export interface CodexQuota {
  state: 'ready' | 'missing-cli' | 'sign-in' | 'timeout' | 'unavailable';
  account: string | null;
  windows: CodexQuotaWindow[];
  updatedAt: number;
}
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function quotaWindows(value: unknown): CodexQuotaWindow[] {
  if (!record(value)) return [];
  const map = value.rateLimitsByLimitId;
  const buckets = record(map) && Object.keys(map).length ? Object.entries(map) : [['codex', value.rateLimits]];
  const windows: CodexQuotaWindow[] = [];
  for (const [id, bucket] of buckets) {
    if (!record(bucket)) continue;
    for (const field of ['primary', 'secondary']) {
      const window = bucket[field];
      if (!record(window)) continue;
      const used = window.usedPercent, minutes = window.windowDurationMins, reset = window.resetsAt;
      if (typeof used !== 'number' || !Number.isFinite(used) || used < 0 || typeof minutes !== 'number' || !Number.isSafeInteger(minutes) || minutes <= 0) continue;
      const resetsAt = typeof reset === 'number' && Number.isFinite(reset) && reset > 0 && Number.isFinite(new Date(reset * 1000).getTime()) ? reset * 1000 : null;
      windows.push({ bucket: typeof bucket.limitName === 'string' && bucket.limitName ? bucket.limitName : String(bucket.limitId ?? id),
        minutes, usedPercent: used, remainingPercent: Math.max(0, 100 - used), resetsAt });
    }
  }
  return windows;
}

/** A command override is used by local protocol tests; the application uses the installed Codex CLI. */
export class CodexQuotaReader {
  private pending: Promise<CodexQuota> | null = null;
  constructor(private readonly command: readonly [string, ...string[]] = process.platform === 'win32'
    ? ['cmd.exe', '/d', '/s', '/c', 'codex app-server'] : ['codex', 'app-server'], private readonly timeoutMs = 15_000) {}

  read(): Promise<CodexQuota> {
    if (this.pending) return this.pending;
    this.pending = this.query().finally(() => { this.pending = null; });
    return this.pending;
  }

  private query(): Promise<CodexQuota> {
    return new Promise((resolve) => {
      const child = spawn(this.command[0], this.command.slice(1), { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, detached: process.platform !== 'win32' });
      let ended = false, next = 0, buffer = '', bytes = 0;
      const waiting = new Map<number, { resolve: (value: unknown) => void; reject: () => void }>();
      const finish = (state: CodexQuota['state'], account: string | null = null, windows: CodexQuotaWindow[] = []) => {
        if (ended) return;
        ended = true;
        clearTimeout(timer);
        for (const request of waiting.values()) request.reject();
        waiting.clear();
        child.stdin.destroy();
        if (child.pid) {
          if (process.platform === 'win32') {
            const stop = spawn('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
            stop.on('error', () => { child.kill(); });
          } else {
            try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill(); }
          }
        }
        resolve({ state, account, windows, updatedAt: Date.now() });
      };
      const timer = setTimeout(() => finish('timeout'), this.timeoutMs);
      const send = (message: object) => { if (!ended) child.stdin.write(`${JSON.stringify(message)}\n`); };
      const request = (method: string, params?: object): Promise<unknown> => new Promise((done, reject) => {
        if (ended) { reject(new Error('closed')); return; }
        const id = ++next;
        waiting.set(id, { resolve: done, reject: () => reject(new Error('RPC failed')) });
        send({ id, method, ...(params ? { params } : {}) });
      });
      child.on('error', (error) => finish((error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing-cli' : 'unavailable'));
      child.on('exit', (code) => finish(process.platform === 'win32' && code === 9009 && next === 1 ? 'missing-cli' : 'unavailable'));
      child.stdin.on('error', () => finish('unavailable'));
      // Diagnostics may contain account or credential details; they are drained without retention.
      child.stderr.resume();
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        bytes += Buffer.byteLength(chunk, 'utf8');
        if (bytes > 1024 * 1024) { finish('unavailable'); return; }
        buffer += chunk;
        for (let end; (end = buffer.indexOf('\n')) !== -1;) {
          const line = buffer.slice(0, end).trim(); buffer = buffer.slice(end + 1);
          if (!line) continue;
          let message: unknown;
          try { message = JSON.parse(line); } catch { finish('unavailable'); return; }
          if (!record(message)) { finish('unavailable'); return; }
          if (typeof message.method === 'string') {
            if (message.id !== undefined) send({ id: message.id, error: { code: -32601, message: 'Read-only client' } });
            continue;
          }
          const pending = typeof message.id === 'number' ? waiting.get(message.id) : undefined;
          if (!pending) continue;
          waiting.delete(message.id as number);
          if (message.error) pending.reject(); else pending.resolve(message.result);
        }
      });
      void (async () => {
        try {
          await request('initialize', { clientInfo: { name: 'coopanion_usage', title: 'Coopanion usage', version: '1.0.0' } });
          send({ method: 'initialized', params: {} });
          const identity = await request('account/read', { refreshToken: false });
          const account = record(identity) ? identity.account : null;
          if (!record(account) || account.type !== 'chatgpt') { finish('sign-in'); return; }
          const email = typeof account.email === 'string' ? account.email : null;
          const data = await request('account/rateLimits/read');
          const windows = quotaWindows(data);
          finish(windows.length ? 'ready' : 'unavailable', email, windows);
        } catch { finish('unavailable'); }
      })();
    });
  }
}
