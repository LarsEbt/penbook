import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { load } from './helpers.mjs';

const { actionIcon, setLocale, en, de, SHORTCUTS, enText, enOf, t } = await load(`
  export { actionIcon } from './src/icons'; export { setLocale, enText, enOf, t } from './src/i18n';
  export { en } from './src/i18n/en'; export { de } from './src/i18n/de'; export { SHORTCUTS } from './src/shortcuts';`);
const golden = JSON.parse(await readFile(new URL('./fixtures/icons.golden.json', import.meta.url), 'utf8'));
// Deliberate differences: in the Chinese original these two menu entries used a near-miss word or none, so they
// fell back to the PDF / settings icon. The English rules give the sensible icon.
const intended = { copy_of_notebook_file: 'copy', crop_pdf_page: 'crop' };
const fill = s => s.replace(/\{\d+\}/g, '1');

// The golden file records the icon each toolbar/menu label got when the rules still matched the original Chinese labels.
test('actionIcon gives every UI string the icon it had before the English rewrite, in every locale', () => {
  const failures = [];
  for (const [name, dict] of [['en', en], ['de', de]]) {
    setLocale(name);
    for (const key of Object.keys(golden)) {
      const got = actionIcon(fill(dict[key]));
      if (got !== (intended[key] ?? golden[key])) failures.push(`${name}.${key}: "${dict[key]}" -> ${got}, expected ${intended[key] ?? golden[key]}`);
    }
  }
  assert.deepEqual(failures, []);
});

test('every shortcut has a label in every locale', () => {
  for (const [id, key] of SHORTCUTS) for (const l of ['en', 'de']) {
    setLocale(l);
    assert.notEqual(t(key), key, `${id} (${key}) has no ${l} label`);
  }
});

test('tool buttons find their shortcut in every locale', () => {
  // Mirrors PenbookView.button(): a toolbar title is matched to a shortcut through its English text (+ " tool").
  const titles = { pen: 'fountain_pen', eraser: 'eraser', lasso: 'lasso', shape: 'shape', sticky: 'sticky', laser: 'laser', tape: 'tape', link: 'link', table: 'table', text: 'text_box', hand: 'pan' };
  const match = title => SHORTCUTS.find(([, key]) => { const e = enOf(title), name = enText(key); return name === e || name === `${e} tool`; })?.[0];
  for (const l of ['en', 'de']) {
    setLocale(l);
    for (const [id, key] of Object.entries(titles)) assert.equal(match(t(key)), id, `${l}: ${key}`);
  }
});
