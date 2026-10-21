import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const editor=readFileSync(new URL('../src/features/admin/section-editor.tsx',import.meta.url),'utf8');

test('new timeline milestones default to PRIVATE in add() and in the add-milestone button',()=>{
  assert.match(editor,/payload:kind==='TIMELINE'\?\{timeline:\[\{at:'',title:'',note:'',venue:'',audience:'PRIVATE',tentative:false\}\]\}:defaultPayload\(kind\)/);
  assert.match(editor,/setItems\(\[\.\.\.items,\{at:'',title:'',note:'',venue:'',audience:'PRIVATE',tentative:false\}\]\)/);
});
test('legacy root milestone keeps PUBLIC mirror with explanatory comment (RD09)',()=>{
  assert.match(editor,/Mốc gốc hàng cũ giữ PUBLIC có chủ đích/);
  assert.match(editor,/return \[\{at:section\.startsAt,title:'',note:'',venue:'',audience:'PUBLIC',tentative:false\}\];/);
});
test('public exposure panel exists, lists public milestones and warns for public ceremony',()=>{
  assert.match(editor,/function PublicExposurePanel/);
  assert.match(editor,/className="public-exposure-panel"/);
  assert.match(editor,/mốc công khai: /);
  assert.match(editor,/Nghi lễ riêng đang bật công khai trên thiệp chung/);
});
test('public preview context marks sections hidden because private',()=>{
  assert.match(editor,/Đang ẩn khỏi thiệp chung vì quyền riêng tư/);
  assert.match(editor,/context==='public'&&rows&&rows\.some\(row=>row\.enabled&&row\.audience==='PRIVATE'\)/);
});
