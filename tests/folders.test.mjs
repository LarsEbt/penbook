import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { resolveFolders } = await load(`export { resolveFolders } from './src/folders';`);
const LEGACY = { folder: '\u624b\u5199\u7b14\u8bb0', exp: '\u5bfc\u51fa', tpl: '\u6a21\u677f' }; // the original Chinese default folder names
const fresh = { folder: 'Handwritten Notes', exportFolder: 'Exports', templateFolder: 'Templates' };
const vault = (...paths) => async p => paths.includes(p);

test('new install in an empty vault gets the localized defaults and asks to persist them', async () => {
  const { settings, changed } = await resolveFolders({}, vault(), fresh);
  assert.deepEqual(settings, fresh);
  assert.equal(changed, true);
});

test('vault that already has the original Chinese folders keeps them (no data.json yet)', async () => {
  const { settings } = await resolveFolders({}, vault(LEGACY.folder, `${LEGACY.folder}/${LEGACY.exp}`, `${LEGACY.folder}/${LEGACY.tpl}`), fresh);
  assert.deepEqual(settings, { folder: LEGACY.folder, exportFolder: LEGACY.exp, templateFolder: LEGACY.tpl });
});

test('existing user with saved folder keeps it even in an English UI; only missing subfolders are decided', async () => {
  const saved = { folder: LEGACY.folder };
  const { settings, changed } = await resolveFolders(saved, vault(`${LEGACY.folder}/${LEGACY.exp}`), fresh);
  assert.equal(settings.folder, LEGACY.folder);
  assert.equal(settings.exportFolder, LEGACY.exp);       // exists -> keep
  assert.equal(settings.templateFolder, 'Templates'); // nothing to preserve -> localized
  assert.equal(changed, true);
});

test('saved values are never overridden and nothing is rewritten when all three are present', async () => {
  const saved = { folder: 'My/Notes', exportFolder: 'out', templateFolder: 'tpl' };
  const { settings, changed } = await resolveFolders(saved, vault(LEGACY.folder), fresh);
  assert.deepEqual(settings, saved);
  assert.equal(changed, false);
});

test('an empty string saved by the user is respected (not treated as missing)', async () => {
  const { settings } = await resolveFolders({ folder: '', exportFolder: '', templateFolder: '' }, vault(LEGACY.folder), fresh);
  assert.equal(settings.folder, '');
});
