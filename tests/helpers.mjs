import { build } from 'esbuild';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');

/** Bundle a TypeScript snippet (imports resolve relative to the repo root) and return its module namespace. */
export async function load(source) {
  const result = await build({
    stdin: { contents: source, loader: 'ts', resolveDir: root },
    bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
    alias: { obsidian: join(root, 'tests/stubs/obsidian.ts') },
    loader: { '.svg': 'text' },
  });
  const dir = await mkdtemp(join(tmpdir(), 'penbook-test-'));
  const file = join(dir, 'bundle.mjs');
  await writeFile(file, result.outputFiles[0].text);
  return import(pathToFileURL(file).href);
}
