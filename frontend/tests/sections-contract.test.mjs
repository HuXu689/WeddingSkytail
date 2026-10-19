import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL(file,import.meta.url),'utf8');
test('sections render plain text, color is decorative and timeline uses time element',()=>{
 const source=read('../src/features/invitation/sections.tsx');
 assert.match(source,/sections.filter\(section=>section.enabled\)/);
 assert.match(source,/<time dateTime=/);assert.match(source,/text\(section.body\)/);
 assert.match(source,/aria-hidden="true"/);assert.doesNotMatch(source,/dangerouslySetInnerHTML|iframe/);
});
test('optional sections default private/disabled and cannot hide RSVP',()=>{
 const source=read('../src/features/admin/section-editor.tsx');
 assert.match(source,/audience:'PRIVATE',enabled:false/);
 assert.match(source,/template|Thông tin buổi tiệc và RSVP không thể tắt/);
 assert.match(source,/rows.length>=20/);
});
test('map is deferred and address is URL encoded, never proxying an arbitrary source',()=>{
 const source=read('../src/features/invitation/event-tools.tsx');
 assert.match(source,/expanded&&/);assert.match(source,/encodeURIComponent\(address\)/);
 assert.doesNotMatch(source,/<iframe|fetch\(/);
});
test('intro decoration is opt-in, small, paused when hidden and reduced-motion aware',()=>{
 const source=read('../src/features/invitation/invitation-entry.tsx'),css=read('../src/features/invitation/design.css');
 assert.match(source,/decoration,setDecoration\]=useState\(false\)/);
 assert.match(source,/visibilitychange/);assert.match(source,/aria-hidden="true"><span>♡/);
 assert.match(css,/\.intro-decoration.is-paused span\{animation-play-state:paused\}/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.intro-decoration\{display:none\}/);
});