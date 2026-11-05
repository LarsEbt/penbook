// Copy the built plugin into an Obsidian vault: PENBOOK_VAULT=/path/to/vault npm run deploy
// Only files from release/penbook are written; the vault's data.json (your settings) is never touched.
import { cp, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const vault = resolve(process.argv[2] ?? process.env.PENBOOK_VAULT ?? '');
if (!process.argv[2] && !process.env.PENBOOK_VAULT) {
  console.error('Set PENBOOK_VAULT (or pass the vault path): PENBOOK_VAULT="$HOME/Obsidian/MyVault" npm run deploy');
  process.exit(1);
}
try { if (!(await stat(join(vault, '.obsidian'))).isDirectory()) throw new Error(); }
catch { console.error(`Not an Obsidian vault (no .obsidian folder): ${vault}`); process.exit(1); }

const { id } = JSON.parse(await readFile('release/penbook/manifest.json', 'utf8'));
const target = join(vault, '.obsidian', 'plugins', id);
await cp('release/penbook', target, { recursive: true });
console.log(`Deployed to ${target}\nReload the plugin in Obsidian (Settings > Community plugins) or run "Reload app without saving".`);
