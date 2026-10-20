import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/features/invitation/design.css',import.meta.url),'utf8');
const page=readFileSync(new URL('../src/app/invitation/[id]/page.tsx',import.meta.url),'utf8');

test('opened private invitation uses a wide page while consent and PIN keep a bounded gate',()=>{
 assert.match(page,/className=\{`invitation-page \$\{data\?'invitation-open':'invitation-gate'\}`\}/);
 assert.match(css,/main\.invitation-open\{width:100%;max-width:none;padding:0;margin:0\}/);
 assert.match(css,/main\.invitation-gate\{width:100%;max-width:860px\}/);
 assert.match(css,/\.invitation-open \.wedding-canvas\{overflow:visible;box-shadow:none\}/);
 assert.match(css,/--guest-gutter:clamp\(16px,4cqw,48px\)/);
});
test('private section labels stack above titles and short stories use a bounded gap',()=>{
 assert.match(css,/\.invitation-open \.section-intro\{display:block/);
 assert.match(css,/\.invitation-open \.wish-book \.section-intro\{padding:0 0 16px/);
 assert.match(css,/@container \(max-width:900px\)\{\s*\.invitation-open \.wedding-story\{display:block\}/);
 assert.match(css,/gap:clamp\(24px,4cqw,48px\);padding:clamp\(40px,5cqw,64px\) 0/);
 assert.match(css,/\.invitation-open \.rsvp-form\{width:100%;max-width:720px;padding:24px\}/);
});

test('guest layout constrains intrinsic photo width and wraps long event content',()=>{
 assert.match(css,/\.theme-elegant \.hero-split \.cover-photo\{width:100%;max-width:100%\}/);
 assert.match(css,/\.wedding-canvas \.event-card\{grid-template-columns:54px minmax\(0,1fr\)\}/);
 assert.match(css,/\.event-content,\.rsvp-summary,\.wish-book,\.wedding-thanks\{overflow-wrap:anywhere\}/);
 assert.match(css,/@container \(max-width:520px\)\{\s*\.wedding-canvas \.event-card\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(css,/\.invitation-entry \.invitation-envelope\{max-width:100%\}/);
});
test('guest controls avoid iOS input zoom and keep touch targets at least 44px',()=>{
 assert.match(css,/\.wedding-canvas input,\.wedding-canvas select,\.wedding-canvas textarea\{font-size:16px\}/);
 assert.match(css,/\.rsvp-summary \.row a\{min-height:44px\}/);
 assert.match(css,/\.wedding-canvas \.button,\.invitation-entry button\{max-width:100%;white-space:normal;overflow-wrap:anywhere\}/);
});
test('album modal reserves close controls and a bounded mobile navigation row',()=>{
 assert.match(css,/padding-top:max\(72px,calc\(env\(safe-area-inset-top\) \+ 60px\)\)/);
 assert.match(css,/dialog\.album-lightbox\{grid-template-rows:minmax\(0,1fr\) 44px;row-gap:12px\}/);
 assert.match(css,/max-height:calc\(100dvh - 212px - env\(safe-area-inset-top\) - env\(safe-area-inset-bottom\)\)/);
});
test('RSVP synchronizes server changes without resetting a draft on unrelated reload',()=>{
 assert.match(page,/useEffect\(\(\)=>\{setStatus\(event.status\|\|'ATTENDING'\)/);
 assert.match(page,/\[event.response_version,event.status,event.total_people,event.note\]/);
 assert.doesNotMatch(page,/\},\[event\]\)/);
 assert.match(page,/data.events.filter\(item=>item.state==='PUBLISHED'&&item.status\).length/);
});
test('RSVP blocks duplicate submissions and disables editing while the request is pending',()=>{
 assert.match(page,/if\(submitting.current\)return;submitting.current=true/);
 assert.match(page,/finally\{submitting.current=false;setBusy\(false\)/);
 assert.match(page,/className="rsvp-form" aria-busy=\{busy\}/);
 for(const control of ['select','input','textarea'])assert.match(page,new RegExp(`<${control} disabled=\\{busy\\}`));
 assert.match(page,/busy\?'Đang lưu…':'Lưu xác nhận'/);
 assert.match(page,/chưa tải lại được/);
});