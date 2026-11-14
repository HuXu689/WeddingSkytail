import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL(`../src/features/invitation/${file}`,import.meta.url),'utf8');

test('cinematic illustrations are decorative, deterministic and dependency-free',()=>{
 const source=read('wedding-illustration.tsx');
 assert.match(source,/aria-hidden="true" focusable="false"/);
 assert.doesNotMatch(source,/Math.random|setInterval|fetch\(|https?:/);
 for(const kind of ['rings','heart','flower','spark'])assert.ok(source.includes(`'${kind}'`));
});
test('cinematic motion remains finite, reduced-motion aware and excludes forms',()=>{
 const css=read('cinematic.css');
 assert.match(css,/prefers-reduced-motion:no-preference/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.reveal\.is-visible:not\(:has\(form\)\):not\(form\)/);
 assert.match(css,/\.reveal\.is-visible\{animation:none!important\}/);
 assert.doesNotMatch(css,/infinite|transition:all|scroll-behavior:smooth/);
});
test('envelope illustration does not change authorization or add an artificial delay',()=>{
 const entry=read('invitation-entry.tsx');
 assert.match(entry,/envelope-letter/);
 assert.match(entry,/await openInvitation\(id\)/);
 assert.doesNotMatch(entry,/setTimeout|animationend/);
});