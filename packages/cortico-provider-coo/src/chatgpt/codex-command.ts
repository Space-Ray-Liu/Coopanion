/** Resolve a Windows native CLI without invoking npm's console-launching script. */
import { existsSync, realpathSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';

export type CodexCommand = readonly [string, ...string[]];
const file = (path: string) => { try { return statSync(path).isFile(); } catch { return false; } };

export function windowsCodexCommand(pathValue = process.env.PATH ?? process.env.Path ?? '', arch: string = process.arch): CodexCommand | null {
  const target = arch === 'x64' ? 'x86_64-pc-windows-msvc' : arch === 'arm64' ? 'aarch64-pc-windows-msvc' : null;
  if (!target) return null;
  for (const entry of pathValue.split(';')) {
    const dir = entry.trim().replace(/^"(.*)"$/, '$1');
    if (!dir) continue;
    const direct = join(dir, 'codex.exe');
    if (file(direct)) return [direct, 'app-server'];
    if (!file(join(dir, 'codex.cmd'))) continue;
    const roots = [join(dir, 'node_modules', '@openai', 'codex')];
    if (basename(dir) === '.bin') roots.push(join(dir, '..', '@openai', 'codex'));
    for (const root of roots) {
      if (!existsSync(root)) continue;
      const packageRoot = realpathSync(root);
      const vendors = [join(packageRoot, 'vendor')];
      try {
        const require = createRequire(join(packageRoot, 'package.json'));
        vendors.unshift(join(dirname(require.resolve(`@openai/codex-win32-${arch}/package.json`)), 'vendor'));
      } catch { /* Older installs place the native binary in the main package. */ }
      for (const vendor of vendors) {
        for (const layout of ['bin', 'codex']) {
          const binary = join(vendor, target, layout, 'codex.exe');
          if (file(binary)) return [binary, 'app-server'];
        }
      }
    }
  }
  return null;
}
