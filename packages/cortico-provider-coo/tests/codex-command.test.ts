import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { windowsCodexCommand } from '../src/chatgpt/codex-command.ts';

const dirs: string[] = [];
const root = () => { const dir = mkdtempSync(join(tmpdir(), 'quota cli ')); dirs.push(dir); return dir; };
const put = (file: string, text = '') => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); return file; };
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe('Windows CLI discovery', () => {
  it('starts a native executable directly, including a path with spaces', () => {
    const dir = root(); const exe = put(join(dir, 'codex.exe'));
    expect(windowsCodexCommand(`"${dir}"`, 'x64')).toEqual([exe, 'app-server']);
  });
  it.each(['x64', 'arm64'])('resolves an npm platform package for %s without running the cmd shim', (arch) => {
    const dir = root();
    put(join(dir, 'codex.cmd'), 'exit /b 99');
    const packageRoot = join(dir, 'node_modules', '@openai', 'codex');
    put(join(packageRoot, 'package.json'), '{}');
    const platformRoot = join(packageRoot, 'node_modules', '@openai', `codex-win32-${arch}`);
    put(join(platformRoot, 'package.json'), '{}');
    const target = arch === 'x64' ? 'x86_64-pc-windows-msvc' : 'aarch64-pc-windows-msvc';
    const exe = put(join(platformRoot, 'vendor', target, 'bin', 'codex.exe'));
    expect(windowsCodexCommand(dir, arch)).toEqual([exe, 'app-server']);
  });
  it('resolves a hoisted platform package', () => {
    const dir = root(); put(join(dir, 'codex.cmd'));
    put(join(dir, 'node_modules', '@openai', 'codex', 'package.json'), '{}');
    const platformRoot = join(dir, 'node_modules', '@openai', 'codex-win32-x64');
    put(join(platformRoot, 'package.json'), '{}');
    const exe = put(join(platformRoot, 'vendor', 'x86_64-pc-windows-msvc', 'bin', 'codex.exe'));
    expect(windowsCodexCommand(dir, 'x64')).toEqual([exe, 'app-server']);
  });
  it('supports an older bundled native executable', () => {
    const dir = root(); put(join(dir, 'codex.cmd'));
    const exe = put(join(dir, 'node_modules', '@openai', 'codex', 'vendor', 'x86_64-pc-windows-msvc', 'codex', 'codex.exe'));
    expect(windowsCodexCommand(dir, 'x64')).toEqual([exe, 'app-server']);
  });
  it('reports an incomplete install instead of falling back to the console script', () => {
    const dir = root(); put(join(dir, 'codex.cmd'), 'exit /b 99');
    expect(windowsCodexCommand(dir, 'x64')).toBeNull();
  });
  it('continues past an incomplete shim directory to a usable installation', () => {
    const first = root(), second = root(); put(join(first, 'codex.cmd'));
    const exe = put(join(second, 'codex.exe'));
    expect(windowsCodexCommand(`${first};${second}`, 'x64')).toEqual([exe, 'app-server']);
  });
});
