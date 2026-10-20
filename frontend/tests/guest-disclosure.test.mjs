import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const source=read('../src/features/invitation/guest-disclosure.tsx');
const compiled=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.ES2022}}).outputText;
// The primitive has only an erased type import. Inject React for the classic test transform.
globalThis.__disclosureTestReact=React;
const {GuestDisclosure}=await import(`data:text/javascript;base64,${Buffer.from(compiled.replace('export function','const React=globalThis.__disclosureTestReact; export function')).toString('base64')}`);
test('native disclosure renders closed with mounted content and escaped labels',()=>{
 const html=renderToStaticMarkup(React.createElement(GuestDisclosure,{title:'Viết <lời chúc>',hint:'Chờ duyệt'},React.createElement('textarea',{defaultValue:'Bản nháp'})));
 assert.match(html,/<details class="guest-disclosure">/);
 assert.doesNotMatch(html,/\sopen[=>\s]/);
 assert.match(html,/<summary>/);assert.match(html,/Viết &lt;lời chúc&gt;/);
 assert.match(html,/<textarea>Bản nháp<\/textarea>/);
 assert.match(html,/aria-hidden="true"/);
});
test('wish disclosure wraps the draft and private status, not the approved feed',()=>{
 const wish=read('../src/features/invitation/wish-book.tsx');
 assert.ok(wish.indexOf('<GuestDisclosure')<wish.indexOf('<form className="wish-form"'));
 assert.ok(wish.indexOf('</GuestDisclosure>')>wish.indexOf('className="wish-mine"'));
 assert.ok(wish.indexOf('</GuestDisclosure>')<wish.indexOf('className="wish-list"'));
 assert.doesNotMatch(source,/useState|onClick|role="button"|aria-expanded|&&\s*children/);
});
test('disclosure supplies keyboard focus, bounded marker motion and reduced-motion override',()=>{
 const css=read('../src/features/invitation/design.css');
 assert.match(css,/\.guest-disclosure>summary:focus-visible\{outline:3px solid/);
 assert.match(css,/min-height:56px/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.guest-disclosure\{--guest-motion-duration:0ms\}\.guest-disclosure-mark\{transition:none\}\}/);
});