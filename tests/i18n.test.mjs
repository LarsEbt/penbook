import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const mod = await load(`export * from './src/i18n'; export { en } from './src/i18n/en'; export { de } from './src/i18n/de';`);
const { t, setLocale, resolveLocale, localeFor, enOf, enText, en, de, LOCALES } = mod;
const placeholders = s => (s.match(/\{\w+\}/g) ?? []).sort().join();

test('German has exactly the keys of the English source dictionary', () => {
  assert.deepEqual(Object.keys(de), Object.keys(en));
  assert.deepEqual(LOCALES, ['en', 'de']);
});

test('translations keep their placeholders and are never empty', () => {
  for (const key of Object.keys(en)) {
    assert.ok(en[key].trim() && de[key].trim(), `${key} is empty`);
    assert.equal(placeholders(de[key]), placeholders(en[key]), `de.${key} placeholders differ from en`);
  }
});

test('dictionaries contain no CJK characters', () => {
  for (const key of Object.keys(en)) assert.doesNotMatch(en[key] + de[key], /[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]/, key);
});

test('t() translates per locale and substitutes positional and named params', () => {
  setLocale('en'); assert.equal(t('page_n', [3]), 'Page 3');
  setLocale('de'); assert.equal(t('page_n', [3]), 'Seite 3');
  en.__named = 'Hello {who}, {who}!'; setLocale('en');
  try { assert.equal(t('__named', { who: 'Ada' }), 'Hello Ada, Ada!'); } finally { delete en.__named; }
});

test('t() falls back to English for a key missing in the selected locale, then to the key', () => {
  const saved = de.page_n;
  delete de.page_n;
  try { setLocale('de'); assert.equal(t('page_n', [2]), 'Page 2'); } finally { de.page_n = saved; }
  setLocale('de'); assert.equal(t('no_such_key_anywhere'), 'no_such_key_anywhere');
});

test('t() leaves unknown placeholders intact and does not interpret $ in params', () => {
  setLocale('en');
  assert.equal(t('page_n', []), 'Page {0}');
  assert.equal(t('page_n', ['$&']), 'Page $&');
});

test('resolveLocale maps Obsidian language tags to German or English (the default)', () => {
  for (const [tag, want] of [['de', 'de'], ['de-AT', 'de'], ['DE-ch', 'de'], ['en', 'en'], ['en-gb', 'en'], ['zh-TW', 'en'], ['fr', 'en'], ['', 'en'], [null, 'en'], [undefined, 'en']])
    assert.equal(resolveLocale(tag), want, String(tag));
});

test('localeFor honours explicit choices; unknown or removed values behave like auto', () => {
  for (const l of LOCALES) assert.equal(localeFor(l), l);
  for (const stale of ['zh', 'klingon', undefined, 'auto']) assert.equal(localeFor(stale), 'en'); // no Obsidian here -> English
});

test('enOf maps a translated label back to English, including parameterised ones', () => {
  setLocale('de');
  assert.equal(enOf(t('fountain_pen')), 'Fountain pen');
  assert.equal(enOf(t('ink_color_n', ['#ff0000'])), 'Ink color #ff0000');
  assert.equal(enOf(t('eraser_radius_n', [7])), 'Eraser radius 7');
  assert.equal(enOf('not a known label'), 'not a known label');
  setLocale('en');
  assert.equal(enOf('Fountain pen'), 'Fountain pen');
  assert.equal(enText('sc_tool_pen'), 'Fountain pen tool');
});
