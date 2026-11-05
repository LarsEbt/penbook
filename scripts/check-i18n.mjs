// Verifies the locale dictionaries stay in sync and every t('key') in src/ exists. English (en.ts) is the source.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const load=async l=>{const src=await readFile(`src/i18n/${l}.ts`,'utf8');return Object.fromEntries([...src.matchAll(/^  ("(?:[^"\\]|\\.)*"): ("(?:[^"\\]|\\.)*"),$/gm)].map(m=>[JSON.parse(m[1]),JSON.parse(m[2])]));};
const [en,de]=await Promise.all(['en','de'].map(load));
const keys=Object.keys(en);assert.ok(keys.length>400);
assert.deepEqual(Object.keys(de),keys,'de keys differ from en');
const ph=s=>(s.match(/\{\w+\}/g)??[]).sort().join();
const CJK=/[　-〿一-鿿＀-￯]/;
for(const k of keys){
  assert.ok(en[k].trim()&&de[k].trim(),`${k} empty`);
  assert.equal(ph(de[k]),ph(en[k]),`de.${k}: placeholders differ from en`);
  assert.ok(!CJK.test(en[k]+de[k]),`CJK characters in ${k}`);
}
const used=new Set();
for(const f of await readdir('src'))if(f.endsWith('.ts'))for(const m of (await readFile(`src/${f}`,'utf8')).matchAll(/\bt\('([a-z0-9_]+)'/g))used.add(m[1]);
for(const k of used)assert.ok(k in en,`unknown i18n key: ${k}`);
console.log(`i18n ok: ${keys.length} keys x 2 locales, ${used.size} used in code`);
