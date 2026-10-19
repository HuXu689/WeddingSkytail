import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resetPresentation} from '../src/features/admin/design-defaults.ts';
test('EDITOR-001: reset preserves all content and media, and never mutates input',()=>{
 const before={theme:'MODERN',accent:'NAVY',names:'Hà & An',story:'Riêng tư',albumUrls:['a'],musicUrl:'b'};
 const after=resetPresentation(before);
 assert.deepEqual(after,{...before,theme:'ELEGANT',accent:'OLIVE'});
 assert.equal(before.theme,'MODERN');assert.equal(after.albumUrls,before.albumUrls);
});
test('EDITOR-002: mobile switches panels without unmounting draft or granting guest access',()=>{
 const source=readFileSync(new URL('../src/features/admin/design-editor.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/app/admin/admin.css',import.meta.url),'utf8');
 const preview=readFileSync(new URL('../src/features/admin/preview.tsx',import.meta.url),'utf8');
 assert.match(source,/editor-panel-\$\{panel\}/);assert.match(css,/\.editor-panel-edit \.design-preview,\.editor-panel-preview \.design-controls\{display:none\}/);
 assert.match(source,/disabled=\{busy\|\|dirty\}/);
 assert.match(source,/setDesign\(value=>resetPresentation\(value\)\)/);
 assert.doesNotMatch(preview,/localStorage|sessionStorage|\/guest\/|dangerouslySetInnerHTML/);
});
test('EDITOR-001: failed media load keeps the selected track and offers retry',()=>{
 const source=readFileSync(new URL('../src/features/admin/design-editor.tsx',import.meta.url),'utf8');
 assert.match(source,/Thử tải lại danh sách nhạc/);
 assert.match(source,/onClick=\{\(\)=>void loadAudio\(\)\}/);
 assert.doesNotMatch(source,/catch\(\(\)=>setAudio\(\[\]\)\)/);
 assert.match(source,/musicId\|\|null/);
});