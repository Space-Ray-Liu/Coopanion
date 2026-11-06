import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { CodexQuotaReader, quotaWindows } from '../src/chatgpt/codex-quota.ts';

const fixture = fileURLToPath(new URL('./fixtures/quota-rpc.cjs', import.meta.url));
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
const reader = (mode: string) => new CodexQuotaReader([process.execPath, fixture, mode], 3000);

describe('quota protocol adapter', () => {
  it('uses a local account and reads real window values through the initialized protocol', async () => {
    const quota = await reader('ready').read();
    expect(quota.state).toBe('ready');
    expect(quota.account).toBe('account@example.test');
    expect(quota.windows).toEqual([
      { bucket: 'main', minutes: 300, usedPercent: 25, remainingPercent: 75, resetsAt: 2000000000000 },
      { bucket: 'main', minutes: 10080, usedPercent: 60, remainingPercent: 40, resetsAt: null },
    ]);
  });
  it.each(['signed-out', 'api-key'])('requires an account sign-in for %s', async (mode) => {
    expect((await reader(mode).read()).state).toBe('sign-in');
  });
  it.each(['empty', 'error', 'malformed'])('returns no invented quota for %s', async (mode) => {
    const quota = await reader(mode).read();
    expect(quota.state).toBe('unavailable');
    expect(quota.windows).toEqual([]);
    expect(JSON.stringify(quota)).not.toContain('private diagnostic');
  });
  it('reports a missing command', async () => {
    expect((await new CodexQuotaReader(['nonexistent-quota-test-command'], 1000).read()).state).toBe('missing-cli');
  });
  it('times out, shares concurrent queries, and stops the child process', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'quota-rpc-')); dirs.push(dir);
    const pidFile = join(dir, 'pid');
    const query = new CodexQuotaReader([process.execPath, fixture, 'hang', pidFile], 1000);
    const first = query.read(), second = query.read();
    expect(await first).toEqual(await second);
    expect((await first).state).toBe('timeout');
    const pid = Number(readFileSync(pidFile, 'utf8'));
    await expect.poll(() => {
      try { process.kill(pid, 0); return false; } catch { return true; }
    }).toBe(true);
  });
});

describe('quota windows', () => {
  it('supports old single-bucket replies and preserves zero remaining at exhaustion', () => {
    expect(quotaWindows({ rateLimits: { limitId: 'main', primary: { usedPercent: 100, windowDurationMins: 300 } } })).toEqual([
      { bucket: 'main', minutes: 300, usedPercent: 100, remainingPercent: 0, resetsAt: null },
    ]);
  });
  it('keeps separate buckets and does not label an unknown duration as five hours', () => {
    const windows = quotaWindows({ rateLimitsByLimitId: {
      main: { primary: { usedPercent: 12.5, windowDurationMins: 15 } },
      other: { secondary: { usedPercent: 110, windowDurationMins: 60 } },
    } });
    expect(windows.map((window) => [window.bucket, window.minutes, window.remainingPercent])).toEqual([['main', 15, 87.5], ['other', 60, 0]]);
  });
  it.each([{}, null, { rateLimits: {} }, { rateLimits: { primary: { usedPercent: null, windowDurationMins: 300 } } },
    { rateLimits: { primary: { usedPercent: -2, windowDurationMins: 300 } } },
    { rateLimits: { primary: { usedPercent: 25, windowDurationMins: null } } }])('does not guess missing or invalid values: %j', (value) => {
    expect(quotaWindows(value)).toEqual([]);
  });
});
