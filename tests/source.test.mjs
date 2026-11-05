import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const ts = createRequire(import.meta.url)('typescript');
const CJK = /[一-鿿]/;
const src = join(import.meta.dirname, '..', 'src');
const files = (await readdir(src)).filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));

// CJK text that is intentionally still in the source: values of earlier releases that must keep working.
const ALLOWED = {
  'folders.ts': ['\u624b\u5199\u7b14\u8bb0', '\u5bfc\u51fa', '\u6a21\u677f'], // default folder names of the original releases (written as escapes)
  'templates.ts': ['简体中文', '繁體中文'],  // per-notebook "language" values already stored in .penbook files
};

function literalsWithCjk(text, name) {
  const sf = ts.createSourceFile(name, text, ts.ScriptTarget.ES2022, true);
  const hits = [];
  const visit = node => {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && CJK.test(node.text)) hits.push(node.text);
    else if (ts.isTemplateExpression(node)) for (const part of [node.head, ...node.templateSpans.map(s => s.literal)]) if (CJK.test(part.text)) hits.push(part.text);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return hits;
}

test('no CJK string literal is left in the source apart from the documented legacy values', async () => {
  const offenders = [];
  for (const f of files) {
    const allowed = ALLOWED[f] ?? [];
    for (const lit of literalsWithCjk(await readFile(join(src, f), 'utf8'), f)) if (!allowed.includes(lit)) offenders.push(`${f}: ${lit}`);
  }
  assert.deepEqual(offenders, []);
});

test('every t("key") used in the source exists in the dictionaries', async () => {
  const dict = await readFile(join(src, 'i18n/en.ts'), 'utf8');
  const known = new Set([...dict.matchAll(/^  "([a-z0-9_]+)":/gm)].map(m => m[1]));
  const missing = [];
  for (const f of files) for (const m of (await readFile(join(src, f), 'utf8')).matchAll(/\bt\('([a-z0-9_]+)'/g)) if (!known.has(m[1])) missing.push(`${f}: ${m[1]}`);
  assert.deepEqual(missing, []);
});

test('no CJK characters in comments or any other source text', async () => {
  const offenders = [];
  for (const f of files) {
    const text = await readFile(join(src, f), 'utf8');
    text.split('\n').forEach((line, i) => { if (CJK.test(line) && !(ALLOWED[f] ?? []).some(a => line.includes(a))) offenders.push(`${f}:${i + 1}`); });
  }
  assert.deepEqual(offenders, []);
});

test('the erase worker stays free of the i18n module (it is bundled separately and has no locale)', async () => {
  assert.doesNotMatch(await readFile(join(src, 'erase-worker.ts'), 'utf8'), /i18n/);
});
