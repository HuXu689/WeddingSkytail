import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/app/admin/admin.css',import.meta.url),'utf8');
test('desktop sidebar bounds its height and scrolls the complete menu without shrinking targets',()=>{
 const sidebar=css.match(/\.sidebar \{([^}]+)\}/)?.[1]??'';
 for(const rule of ['height:100vh','height:100dvh','overflow-y:auto','align-self:start','scroll-padding-block:16px','overscroll-behavior-y:contain'])assert.ok(sidebar.includes(rule),rule);
 assert.match(css,/\.sidebar>\.brand,\.sidebar>nav,\.sidebar>\.sidebar-foot \{ flex-shrink:0; \}/);
 assert.match(css,/\.sidebar nav a:focus-visible,\.sidebar-foot a:focus-visible/);
});
test('mobile sidebar remains in page flow instead of becoming a nested viewport scroller',()=>{
 assert.match(css,/@media\(max-width:760px\) \{[\s\S]*?\.sidebar \{ position:static; height:auto; overflow-y:visible; overscroll-behavior-y:auto; scrollbar-gutter:auto;/);
});