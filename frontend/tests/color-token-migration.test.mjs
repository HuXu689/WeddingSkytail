import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveCompatibilityColors} from './helpers/css-tokens.mjs';
const files=['../src/app/globals.css','../src/app/admin/admin.css','../src/features/invitation/design.css'];
test('TOK-002: component declarations contain no hardcoded hex colors',()=>{
 for(const file of files){
  const css=readFileSync(new URL(file,import.meta.url),'utf8');
  for(const match of css.matchAll(/([\w-]+)\s*:\s*([^{};]+)/g)){
   if(!match[1].startsWith('--'))assert.doesNotMatch(match[2],/#[\da-fA-F]{3,8}\b|rgba?\(|\b(?:white|black|transparent)\b/,`${file}: ${match[0]}`);
  }
 }
});
test('TOK-002: compatibility tokens preserve exact values, including alpha shadows',()=>{
 for(const file of files)assert.doesNotThrow(()=>resolveCompatibilityColors(readFileSync(new URL(file,import.meta.url),'utf8')));
 assert.equal(resolveCompatibilityColors('var(--compat-color-25332918)'),'#25332918');
 assert.equal(resolveCompatibilityColors('var(--compat-color-fff)'),'#fff');
 assert.equal(resolveCompatibilityColors(`var(--compat-paint-${Buffer.from('transparent').toString('hex')})`),'transparent');
 assert.throws(()=>resolveCompatibilityColors('var(--compat-color-deadbeef)'),/Undefined/);
});
test('TOK-002: palette is loaded before shared styles for every route and popup copy',()=>{
 const layout=readFileSync(new URL('../src/app/layout.tsx',import.meta.url),'utf8');
 assert.ok(layout.indexOf("'./color-tokens.css'")<layout.indexOf("'./globals.css'"));
});