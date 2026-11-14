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

test('T15: editor đổi được thứ tự người/nhóm/thành viên và cảnh báo mục bật nhưng rỗng',()=>{
  const adminCss=read('../src/app/admin/admin.css');
  // Đổi thứ tự: helper thuần + nút có aria-label ở cả 3 cấp.
  assert.match(editor,/function moveItem<T>\(items:T\[\],from:number,to:number\):T\[\]/);
  assert.match(editor,/aria-label=\{`Đưa người \$\{position\+1\} lên`\}/);
  assert.match(editor,/aria-label=\{`Đưa nhóm \$\{position\+1\} xuống`\}/);
  assert.match(editor,/aria-label=\{`Đưa thành viên \$\{memberPosition\+1\} lên`\}/);
  assert.match(editor,/setPeople\(moveItem\(people,position,position-1\)\)/);
  assert.match(editor,/setGroups\(moveItem\(groups,position,position\+1\)\)/);
  assert.match(editor,/members:moveItem\(group\.members,memberPosition,memberPosition\+1\)/);
  // Cảnh báo chỉ khi mục đang bật và không có nội dung hiển thị.
  assert.match(editor,/function hasVisibleContent\(section:ContentSection\):boolean/);
  assert.match(editor,/row\.enabled&&!hasVisibleContent\(row\)&&<p className="field-hint section-empty-warning">/);
  assert.match(editor,/sẽ không hiển thị trên thiệp/);
  // Không báo nhầm cho hàng cũ chỉ có startsAt (TIMELINE) hoặc color (DRESS_CODE).
  assert.match(editor,/Boolean\(section\.startsAt\)/);
  assert.match(editor,/Boolean\(section\.color\)/);
  assert.equal(adminCss.includes('.section-empty-warning{'),true,'Thiếu CSS cảnh báo mục rỗng');
});

test('T17: xem trước có ngữ cảnh link không hợp lệ và không render nội dung riêng tư',()=>{
  const entry=read('../src/features/invitation/invitation-entry.tsx');
  const copy=read('../src/features/invitation/access-copy.ts');
  const adminCss=read('../src/app/admin/admin.css');
  // Mục 5: tối thiểu ba ngữ cảnh — công khai, khách đã mở thiệp, link không hợp lệ.
  assert.match(editor,/type PreviewContext='guest'\|'public'\|'invalid';/);
  assert.match(editor,/useState<PreviewContext>\('guest'\)/);
  assert.match(editor,/const previewContexts:\{id:PreviewContext;label:string;note:string\}\[\]=\[/);
  assert.match(editor,/data-context=\{item\.id\}/);
  for(const value of ['guest','public','invalid'])assert.equal(editor.includes(`{id:'${value}',label:`),true,`Thiếu lựa chọn ngữ cảnh ${value}`);
  // Ngữ cảnh link không hợp lệ không nhận phần nào: máy chủ từ chối trước khi trả dữ liệu.
  assert.match(editor,/context==='invalid'\?\[\]:\(rows\?\?\[\]\)/);
  assert.match(editor,/className="preview-denied" role="note"/);
  assert.match(editor,/không thấy phần nội dung nào/);
  // Một nguồn câu chữ duy nhất cho trang thiệp thật và xem trước (không chép lại chuỗi).
  assert.match(copy,/export const INVITATION_UNAVAILABLE='Thiệp hiện không khả dụng/);
  assert.match(entry,/import \{INVITATION_UNAVAILABLE as unavailable\} from '\.\/access-copy';/);
  assert.match(editor,/import \{INVITATION_UNAVAILABLE\} from '@\/features\/invitation\/access-copy';/);
  assert.doesNotMatch(entry,/const unavailable='Thiệp hiện không khả dụng/);
  assert.equal(adminCss.includes('.preview-denied{'),true,'Thiếu CSS khối xem trước link không hợp lệ');
});

test('T18: hàng TIMELINE cũ chỉ có starts_at vẫn lưu được, không bắt đặt tên mốc',()=>{
  const adminCss=read('../src/app/admin/admin.css');
  // Không còn sinh mốc rỗng từ startsAt trong payload mặc định.
  assert.match(editor,/case 'TIMELINE': return \{timeline:\[\]\};/);
  // Mốc gốc chỉ để hiển thị; nhận diện bằng đúng ngày giờ cũ và chưa có nội dung nào khác.
  assert.match(editor,/function isLegacyMilestone\(section:ContentSection,item:TimelineItem\):boolean/);
  assert.match(editor,/function timelineForEditor\(section:ContentSection\):TimelineItem\[\]/);
  assert.match(editor,/const forSave=\(section:ContentSection\):ContentSection=>section\.kind==='TIMELINE'/);
  // Bỏ mốc gốc trước khi gửi; starts_at vẫn là nguồn hiển thị nên không mất ngày giờ.
  assert.match(editor,/timeline:\(section\.payload\?\.timeline\?\?\[\]\)\.filter\(item=>!isLegacyMilestone\(section,item\)\)/);
  assert.match(editor,/save\(rows\.map\(forSave\)\)/);
  // Kiểm tra gần trường bỏ qua mốc gốc nhưng vẫn bắt mốc do người dùng thêm.
  assert.match(editor,/item=>!isLegacyMilestone\(section,item\)&&\(!item\.at\|\|!item\.title\.trim\(\)\)/);
  // Khớp server: TIMELINE luôn cần ít nhất một nguồn mốc, kể cả khi mục đang tắt.
  assert.match(editor,/section\.kind==='TIMELINE'&&!\(section\.payload\?\.timeline\?\?\[\]\)\.some\(item=>item\.at&&item\.title\.trim\(\)\)&&!section\.startsAt/);
  // Giao diện: nói rõ mốc cũ, không có nút xóa vô nghĩa.
  assert.match(editor,/section-legacy-note/);
  assert.match(editor,/Mốc \{position\+1\}\{legacy\?' \(ngày giờ cũ\)':''\}/);
  assert.equal(adminCss.includes('.section-legacy-note{'),true,'Thiếu CSS ghi chú mốc cũ');
});

test('T19: bỏ được ngày giờ cũ của mục TIMELINE khi đã có mốc chi tiết',()=>{
  const adminCss=read('../src/app/admin/admin.css');
  // Truyền hàm cập nhật cả mục xuống bộ trường con (startsAt nằm ngoài payload).
  assert.match(editor,/updateRow:\(index:number,patch:Partial<ContentSection>\)=>void/);
  assert.match(editor,/updatePayload=\{updatePayload\} updateRow=\{update\}/);
  assert.match(editor,/function TimelineFields\(\{row,index,updatePayload,updateRow\}:FieldProps\)/);
  // Chỉ bật khi đã có mốc chi tiết có tên: server luôn cần ít nhất một nguồn mốc.
  assert.match(editor,/const namedMilestones=items\.filter\(item=>Boolean\(item\.at\)&&item\.title\.trim\(\)\.length>0\)\.length;/);
  assert.match(editor,/disabled=\{namedMilestones===0\}/);
  assert.match(editor,/Cần ít nhất một mốc chi tiết có tên trước khi bỏ ngày giờ cũ\./);
  // Bỏ ngày giờ cũ = xoá startsAt + bỏ mốc gốc, giữ các mốc chi tiết.
  assert.match(editor,/updateRow\(index,\{startsAt:null\}\)/);
  assert.match(editor,/setItems\(items\.filter\(item=>!isLegacyMilestone\(row,item\)\)\)/);
  assert.match(editor,/Bỏ ngày giờ cũ/);
  assert.equal(adminCss.includes('.section-legacy-actions{'),true,'Thiếu CSS hàng nút bỏ ngày giờ cũ');
});