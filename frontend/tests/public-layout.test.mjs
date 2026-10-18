import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../src/app/w/[slug]/page.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/features/invitation/design.css',import.meta.url),'utf8');

test('public wedding uses a full-width route wrapper rather than the entry card',()=>{
  assert.match(page,/className="public-wedding-page"/);
  assert.doesNotMatch(page,/className="narrow"/);
  assert.match(css,/main\.public-wedding-page\{width:100%;max-width:none;padding:0;margin:0\}/);
});
test('public notice does not generate a private event section',()=>{
  assert.match(page,/<WeddingCanvas design=\{data\}\/>/);
  assert.doesNotMatch(page,/recipient=|\/guest\/|rsvp_open/);
});
test('public layout bounds reading width and uses container-responsive story',()=>{
  assert.match(css,/max-width:1280px/);
  assert.match(css,/@container \(max-width:760px\)/);
  assert.match(css,/\.reveal\{opacity:1;transform:none\}/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});