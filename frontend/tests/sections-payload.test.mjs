import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL(file,import.meta.url),'utf8');
const sections=read('../src/features/invitation/sections.tsx');
const css=read('../src/features/invitation/design.css');
const editor=read('../src/features/admin/section-editor.tsx');
const weddingPage=read('../src/app/admin/wedding/page.tsx');

test('mỗi loại nội dung có bố cục riêng, không dùng chung một card',()=>{
  for(const component of ['IntroSection','FamilySection','CeremonySection','TimelineSection','DressCodeSection'])assert.match(sections,new RegExp(`function ${component}\\(`));
  assert.match(sections,/case 'INTRO': return <IntroSection/);
  assert.match(sections,/case 'DRESS_CODE': return <DressCodeSection/);
  for(const className of ['content-intro','content-family','content-ceremony','content-timeline','content-dress-code'])assert.match(sections,new RegExp(`content-section ${className}`));
  for(const rule of ['.intro-people{','.family-groups{','.ceremony-card{','.timeline-item{','.dress-palette{'])assert.equal(css.includes(rule),true,`Thiếu CSS cho ${rule}`);
});

test('phần rỗng không render khối trống và nội dung chỉ hiển thị bằng văn bản',()=>{
  assert.match(sections,/if\(!people\.length&&!lead\) return null;/);
  assert.match(sections,/if\(!groups\.length&&!lead\) return null;/);
  assert.match(sections,/if\(!items\.length&&!note\) return null;/);
  assert.match(sections,/if\(!palette\.length&&!guidance&&!avoid&&!section\.color\) return null;/);
  assert.doesNotMatch(sections,/dangerouslySetInnerHTML|iframe/);
});

test('lịch trình sắp theo thời gian, nhóm theo ngày, có nhãn dự kiến (mục 4.4)',()=>{
  assert.match(sections,/\.sort\(\(left,right\)=>new Date\(left\.at\)\.getTime\(\)-new Date\(right\.at\)\.getTime\(\)\)/);
  assert.match(sections,/dayFormat\.format\(new Date\(item\.at\)\)/);
  assert.match(sections,/timeline-tentative/);
  assert.match(sections,/<time dateTime=\{item\.at\}>/);
  assert.equal(css.includes('.timeline-day{'),true);
  // Hàng cũ chỉ có starts_at vẫn dùng <time> như trước, không mất nội dung.
  assert.match(sections,/timeline-legacy-time/);
});

test('trang phục luôn có tên màu bằng chữ đi kèm swatch (mục 4.5)',()=>{
  assert.match(sections,/dress-color-name/);
  assert.match(sections,/dress-color-hex/);
  assert.match(sections,/aria-hidden="true"/);
  assert.equal(css.includes('.dress-swatch{display:inline-block;width:44px;height:44px;border:1px solid var(--inv-hairline);border-radius:50%}'),true);
});

test('editor có trường riêng cho từng loại và gửi content schema 2',()=>{
  for(const editor of ['IntroFields','FamilyFields','CeremonyFields','TimelineFields','DressFields'])assert.match(read('../src/features/admin/section-editor.tsx'),new RegExp(`function ${editor}\\(`));
  assert.match(editor,/audience:'PRIVATE',enabled:false/);
  assert.match(editor,/rows\.length>=20/);
  assert.match(editor,/toVietnamInput/);
  assert.match(editor,/fromVietnamInput/);
  assert.match(weddingPage,/contentSchemaVersion:2/);
});

test('xem trước theo ngữ cảnh công khai/thiệp riêng và nói rõ server quyết định quyền',()=>{
  assert.match(editor,/context==='guest'\|\|row\.audience==='PUBLIC'/);
  assert.match(editor,/item\.audience!=='PRIVATE'/);
  assert.match(editor,/máy chủ quyết định quyền thật/);
});