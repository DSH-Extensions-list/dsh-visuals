import { readFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const options = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const flag = process.argv[i];
  if (flag === '--dry-run') options.set(flag, true);
  else if (['--home', '--cli', '--status'].includes(flag) && process.argv[i + 1]) options.set(flag, process.argv[++i]);
  else throw new Error('Usage: node scripts/install.mjs --home DSH_HOME --cli DSH_EXECUTABLE [--status URL] [--dry-run]');
}
const home = options.get('--home') || process.env.DSH_HOME;
if (!home) throw new Error('Provide the installation-owned DSH_HOME with --home.');
const root = fileURLToPath(new URL('..', import.meta.url));
const profile = join(resolve(home), 'profiles', 'desktop');
const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'));
if (manifest.name !== 'dsh-profile-desktop') throw new Error('This is not an initialized Harness Desktop profile.');
const statusURL = options.get('--status') || 'http://127.0.0.1:19387/dsh-market/status';
const status = await fetch(statusURL, { signal: AbortSignal.timeout(5000) }).then(r => {
  if (!r.ok) throw new Error('Cannot verify the running host state: HTTP ' + r.status);
  return r.json();
});
if (!status.agentGuardAvailable || !Array.isArray(status.runningAgents)) throw new Error('Cannot verify that the running host is idle.');
if (status.busy || status.active || status.runningAgents.length) throw new Error('Installation deferred: the host is running agents or another package operation. Retry after the agents and package operations finish.');
const cli = options.get('--cli') || 'dsh';
const command = /\.[cm]?js$/.test(cli) ? process.execPath : cli;
const args = [...(/\.[cm]?js$/.test(cli) ? [resolve(cli)] : []), 'plugin', '--profile', 'desktop', 'add', root];
console.log(JSON.stringify({ home: resolve(home), profile, command, args, dryRun: !!options.get('--dry-run') }, null, 2));
if (options.get('--dry-run')) process.exit(0);
const backup = join(profile, 'visuals-backups', new Date().toISOString().replace(/[:.]/g, '-'));
await mkdir(backup, { recursive: true });
for (const name of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'cordis.yml', 'cordis.patch.yml']) {
  try { await copyFile(join(profile, name), join(backup, name)); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
console.log('Profile metadata backup: ' + backup);
const result = spawnSync(command, args, { cwd: root, env: { ...process.env, DSH_HOME: resolve(home) }, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
const after = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'));
if (!after.dependencies?.['@local/dsh-visuals'] || !after.dsh?.profile?.bundles?.includes('@local/dsh-visuals')) throw new Error('CLI returned success without registering the Visuals bundle. Inspect the profile before restarting.');
console.log('Registered DSH Visuals. Restart Harness when idle, then open Plugins → DSH Visuals.');
