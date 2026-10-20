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
  assert.match(page,/<WeddingCanvas design=\{data\} calendar=\{/);
  assert.match(page,/publicCalendar\(data.sections\?\?\[\]\)/);
  assert.doesNotMatch(page,/recipient=|\/guest\/|rsvp_open/);
});
test('public layout bounds reading width and uses container-responsive story',()=>{
  assert.match(css,/max-width:1280px/);
  assert.match(css,/@container \(max-width:760px\)/);
  assert.match(css,/\.reveal\{opacity:1;transform:none\}/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});

test('album chuyển một cột theo container, không chỉ theo viewport (UI-004)',()=>{
 // Lỗi cũ: chỉ `.public-wedding-page .album-editorial` được override, nên preview điện thoại
 // trong editor (div 390px trên desktop 1440px) vẫn giữ lưới 3 cột của desktop.
 assert.match(css,/\.public-wedding-page \.album-editorial,\.album-editorial\{/);
 assert.match(css,/@container \(max-width:520px\)\{/);
 assert.match(css,/\.event-card\{grid-template-columns:minmax\(0,1fr\)/);
});
test('tên cặp đôi ngắt dòng có kiểm soát và không ngắt tuỳ ý (UI-001)',()=>{
 assert.match(css,/\.wedding-cover h1\.couple-names,\.couple-names\{/);
 assert.match(css,/overflow-wrap:normal/);
 assert.match(css,/\.couple-name\{/);
 assert.match(css,/\.couple-join\{/);
});
test('preview editor bị giới hạn chiều cao, cuộn riêng và không tạo lượt mở (UI-003)',()=>{
 const admin=readFileSync(new URL('../src/app/admin/admin.css',import.meta.url),'utf8');
 assert.match(admin,/\.preview-stage \{[^}]*max-height:min\(64vh,720px\)/);
 assert.match(admin,/\.preview-stage \{[^}]*overflow:auto/);
 assert.match(admin,/overscroll-behavior:contain/);
 assert.match(admin,/@media\(max-width:700px\) \{ \.stats-grid \{ grid-template-columns:minmax\(0,1fr\)/);
});