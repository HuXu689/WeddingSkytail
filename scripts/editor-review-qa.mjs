// QA riêng cho trình chỉnh sửa /admin/wedding. Mọi /api/v1 được mô phỏng NGAY TRONG TRANG:
// không đăng nhập backend thật, không ghi dữ liệu, không dùng nội dung khách thật.
// Chạy khi frontend dev đang chạy:  node scripts/editor-review-qa.mjs
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const origin=process.env.EDITOR_QA_ORIGIN??'http://localhost:3000';
const directory=resolve('.qa-artifacts/editor-review');mkdirSync(directory,{recursive:true});
const browser=spawn(process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run',`--user-data-dir=${directory}/chrome`,'--remote-debugging-port=9242','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket;
try{
 let targets;
 for(let i=0;i<80;i++){try{targets=await(await fetch('http://127.0.0.1:9242/json')).json();break;}catch{await wait(250);}}
 assert.ok(targets,'Chrome DevTools did not start');
 socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let serial=0;const pending=new Map(),errors=[];
 socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);if(message.id){const task=pending.get(message.id);pending.delete(message.id);message.error?task.reject(message.error):task.resolve(message.result);}};
 const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;const timeout=setTimeout(()=>{pending.delete(id);reject(Error(`CDP timeout: ${method}`));},30000);pending.set(id,{resolve:value=>{clearTimeout(timeout);resolve(value);},reject:error=>{clearTimeout(timeout);reject(error);}});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const response=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(response.exceptionDetails)throw Error(JSON.stringify(response.exceptionDetails));return response.result.value;};
 const until=async expression=>{for(let i=0;i<200;i++){if(await evaluate(`Boolean(${expression})`))return;await wait(100);}throw Error(`Timeout: ${expression}`);};
 const screenshot=async name=>{const result=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${directory}/${name}.png`,Buffer.from(result.data,'base64'));};

 const layout=[{section:'MUSIC',enabled:false},{section:'COUNTDOWN',enabled:false},{section:'STORY',enabled:false},{section:'CONTENT',enabled:true},{section:'ALBUM',enabled:false},{section:'THANKS',enabled:false}];
 const wedding={version:7,published:true,names:'An & Bình',draft_names:'An & Bình',message:'Lời mời kiểm thử.',draft_message:'Lời mời kiểm thử.',theme:'ELEGANT',draft_theme:'ELEGANT',accent:'OLIVE',draft_accent:'OLIVE',story:'',draft_story:'',footer:'Cảm ơn bạn.',draft_footer:'Cảm ơn bạn.',show_story:false,draft_show_story:false,show_countdown:false,draft_show_countdown:false,music_autoplay:false,draft_music_autoplay:false,draft_music_id:null,musicUrl:null,heroUrl:null,heroPosition:null,albumUrls:[],tracking:false,mode:'MANUAL_OPEN',open_at:null,close_at:null,layout};
 const sections=[
  {kind:'INTRO',audience:'PUBLIC',enabled:true,title:'Giới thiệu hai bạn',body:'',startsAt:null,color:null,payload:{people:[{name:'Người A',role:'Vai trò A',note:''},{name:'Người B',role:'Vai trò B',note:''}]}},
  {kind:'FAMILY',audience:'PUBLIC',enabled:true,title:'Gia đình',body:'',startsAt:null,color:null,payload:{groups:[{label:'Nhóm Một',members:[{name:'Thành viên 1',note:''}]},{label:'Nhóm Hai',members:[{name:'Thành viên 2',note:''}]}]}},
  {kind:'CEREMONY',audience:'PUBLIC',enabled:true,title:'Nghi lễ riêng',body:'',startsAt:null,color:null,payload:{items:[{title:'Nghi lễ A',lead:'',time:null,venue:'',address:'',directions:''}]}},
  {kind:'TIMELINE',audience:'PUBLIC',enabled:true,title:'Mốc lịch trình',body:'',startsAt:null,color:null,payload:{timeline:[{at:'2027-12-20T09:00:00Z',title:'Mốc công khai',note:'',venue:'',audience:'PUBLIC',tentative:false},{at:'2027-12-20T01:23:00Z',title:'Lễ gia tiên',note:'',venue:'',audience:'PRIVATE',tentative:true}]}},
  {kind:'DRESS_CODE',audience:'PUBLIC',enabled:true,title:'Trang phục',body:'Tông sáng.',startsAt:null,color:null,payload:{palette:[{name:'Trắng ngà',color:'#fffdf9'}],avoid:''}},
  {kind:'CEREMONY',audience:'PRIVATE',enabled:true,title:'Mục rỗng (thử cảnh báo)',body:'',startsAt:null,color:null,payload:{items:[{title:'',lead:'',time:null,venue:'',address:'',directions:''}]}},
  {kind:'TIMELINE',audience:'PUBLIC',enabled:true,title:'Mốc hàng cũ',body:'',startsAt:'2027-12-21T04:00:00Z',color:null,payload:null}
 ];
 await command('Page.enable');await command('Runtime.enable');
 await command('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.fixture=${JSON.stringify({wedding,sections})};window.__saved=null;window.__savedSections=null;
  const nativeFetch=window.fetch;
  window.fetch=async function(input,init){
   const url=String(input);if(!url.startsWith('/api/v1/'))return nativeFetch(input,init);
   if(url.endsWith('/csrf'))return new Response(JSON.stringify({headerName:'X-CSRF',token:'test'}),{status:200,headers:{'Content-Type':'application/json'}});
   let result={};
   if(url.endsWith('/auth/me'))result={username:'owner',role:'OWNER'};
   else if(url.endsWith('/admin/media'))result=[];
   else if(url.endsWith('/admin/wedding/sections')){
    if(init?.method==='PUT'){window.__saved=JSON.parse(init.body);window.__savedSections=window.__saved.sections;return new Response('',{status:200});}
    result=window.__savedSections??window.fixture.sections;
   }
   else if(url.endsWith('/admin/wedding/layout'))result=window.fixture.wedding.layout;
   else if(url.endsWith('/admin/wedding'))result=window.fixture.wedding;
   return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});
  };
 `});
 await command('Page.navigate',{url:`${origin}/admin/wedding`});
 await until(`document.querySelectorAll('.section-editor-item').length>=7`);

 const report={};
 /** Khối theo đúng thứ tự fixture (heading hiển thị loại nên không dùng tiêu đề để định vị). */
 const blockAt=index=>`[...document.querySelectorAll('.section-editor-item')][${index}]`;
 const readFirstInputs=index=>evaluate(`(()=>{const b=${blockAt(index)};return [...b.querySelectorAll('.section-payload-item')].map(item=>item.querySelector('input').value);})()`);
 const clickLabel=(index,label)=>evaluate(`(()=>{const b=${blockAt(index)};const button=[...b.querySelectorAll('button')].find(item=>item.getAttribute('aria-label')===${JSON.stringify(label)});if(!button)return false;button.click();return true;})()`);
 const hasWarning=index=>evaluate(`(()=>{const b=${blockAt(index)};const warning=b.querySelector('.section-empty-warning');return warning?warning.textContent.trim():null;})()`);

 // 1. Bộ trường riêng cho từng loại + cảnh báo mục rỗng (và không báo nhầm hàng cũ).
 const structure=await evaluate(`(()=>{
  const blocks=[...document.querySelectorAll('.section-editor-item')];
  const count=index=>blocks[index]?blocks[index].querySelectorAll('.section-payload-item').length:0;
  return {
   blocks:blocks.length,
   people:count(0),
   groups:count(1),
   ceremonyItems:count(2),
   timelineRows:blocks[3]?blocks[3].querySelectorAll('input[type="datetime-local"]').length:0,
   paletteColors:blocks[4]?blocks[4].querySelectorAll('input[type="color"]').length:0
  };
 })()`);
 report.structure=structure;
 assert.equal(structure.blocks,7,'Phải nạp đủ 7 mục từ fixture');
 assert.equal(structure.people,2);assert.equal(structure.groups,2);assert.equal(structure.ceremonyItems,1);
 assert.equal(structure.timelineRows,2);assert.equal(structure.paletteColors,1);
 const emptyWarning=await hasWarning(5);
 report.emptyWarning=emptyWarning;
 assert.ok(emptyWarning&&emptyWarning.includes('sẽ không hiển thị trên thiệp'),'Mục bật nhưng rỗng phải có cảnh báo');
 assert.equal(await hasWarning(6),null,'Hàng cũ có startsAt không được báo nhầm là rỗng');
 await screenshot('editor-loaded');

 // 2. Đổi thứ tự người trong INTRO: đổi thứ tự trường và vô hiệu hoá nút ở biên.
 assert.deepEqual(await readFirstInputs(0),['Người A','Người B']);
 assert.equal(await clickLabel(0,'Đưa người 2 lên'),true,'Thiếu nút đưa người 2 lên');
 assert.deepEqual(await readFirstInputs(0),['Người B','Người A'],'Nút lên phải đổi thứ tự người');
 const bounds=await evaluate(`(()=>{const b=${blockAt(0)};const items=[...b.querySelectorAll('.section-payload-item')];return {up:items[0].querySelector('button[aria-label="Đưa người 1 lên"]').disabled,down:items[1].querySelector('button[aria-label="Đưa người 2 xuống"]').disabled};})()`);
 report.peopleBounds=bounds;
 assert.deepEqual(bounds,{up:true,down:true},'Nút ở biên phải bị vô hiệu hoá');

 // 3. Đổi thứ tự nhóm trong FAMILY.
 assert.deepEqual(await readFirstInputs(1),['Nhóm Một','Nhóm Hai']);
 assert.equal(await clickLabel(1,'Đưa nhóm 2 lên'),true,'Thiếu nút đưa nhóm 2 lên');
 assert.deepEqual(await readFirstInputs(1),['Nhóm Hai','Nhóm Một'],'Nút lên phải đổi thứ tự nhóm');

 // 4. Cảnh báo mất khi nhập nội dung. Hàng TIMELINE cũ (chỉ có startsAt) KHÔNG được bắt đặt tên mốc.
 await evaluate(`(()=>{const b=${blockAt(5)};const input=b.querySelector('.section-payload-item input');input.focus();return true;})()`);
 await command('Input.insertText',{text:'Nghi lễ thử'});
 await wait(150);
 assert.equal(await hasWarning(5),null,'Nhập nội dung xong thì cảnh báo phải mất');
 const legacyRow=await evaluate(`(()=>{const b=${blockAt(6)};const note=b.querySelector('.section-legacy-note');const title=[...b.querySelectorAll('.section-payload-item input')].find(input=>input.getAttribute('type')!=='datetime-local');return {note:Boolean(note),required:title?title.required:null,deleteButtons:[...b.querySelectorAll('button')].filter(button=>button.textContent==='Xóa mốc này').length};})()`);
 report.legacyMilestone=legacyRow;
 assert.equal(legacyRow.note,true,'Hàng cũ phải giải thích mốc lấy từ ngày giờ cũ');
 assert.equal(legacyRow.required,false,'Tên mốc của hàng cũ không được bắt buộc');
 assert.equal(legacyRow.deleteButtons,0,'Mốc cũ không có nút xóa vô nghĩa');
 await screenshot('editor-after-reorder');

 // 5. Xem trước theo ngữ cảnh: mốc PRIVATE chỉ hiện ở lời mời riêng.
 await evaluate(`(()=>{const details=document.querySelector('.section-editor details');details.open=true;return true;})()`);
 await wait(150);
 const guestPreview=await evaluate(`document.querySelector('.section-editor details').textContent.includes('Lễ gia tiên')`);
 report.guestPreviewHasPrivate=guestPreview;
 assert.equal(guestPreview,true,'Xem trước lời mời riêng phải có mốc PRIVATE');
 // Hàng cũ chỉ có startsAt vẫn phải hiển thị ngày giờ cũ sau khi bỏ mốc gốc khỏi payload.
 const legacyRendered=await evaluate(`Boolean(document.querySelector('.section-editor details .timeline-legacy-time'))`);
 report.legacyTimelineRendered=legacyRendered;
 assert.equal(legacyRendered,true,'Hàng cũ phải tiếp tục hiển thị ngày giờ cũ trên thiệp');
 // Đối chứng: ngữ cảnh lời mời riêng phải render phần nội dung, nếu không thì phép đếm 0 ở ngữ cảnh
 // link sai phía dưới sẽ rỗng nghĩa (luôn bằng 0 vì lý do khác).
 const guestPreviewSections=await evaluate(`document.querySelector('.section-editor details').querySelectorAll('.content-section').length`);
 report.guestPreviewSections=guestPreviewSections;
 assert.ok(guestPreviewSections>0,'Đối chứng: ngữ cảnh lời mời riêng phải render phần nội dung');
 await evaluate(`(()=>{const button=document.querySelector('.section-editor details .preview-segmented button[data-context="public"]');button.click();return true;})()`);
 await wait(250);
 const publicPreview=await evaluate(`document.querySelector('.section-editor details').textContent.includes('Lễ gia tiên')`);
 report.publicPreviewHasPrivate=publicPreview;
 assert.equal(publicPreview,false,'Thiệp chung không được hiện mốc PRIVATE');
 await screenshot('editor-preview-public');

 // 5b. Ngữ cảnh thứ ba "link không hợp lệ": không render phần nào và dùng câu chữ chung của trang thiệp.
 const contextOptions=await evaluate(`[...document.querySelectorAll('.section-editor details .preview-segmented button')].map(button=>button.dataset.context)`);
 report.previewContextOptions=contextOptions;
 assert.deepEqual(contextOptions,['guest','public','invalid'],'Xem trước phải có đủ ba ngữ cảnh');
 await evaluate(`(()=>{const button=document.querySelector('.section-editor details .preview-segmented button[data-context="invalid"]');button.click();return true;})()`);
 await wait(250);
 const deniedPreview=await evaluate(`(()=>{const details=document.querySelector('.section-editor details');const panel=details.querySelector('.preview-denied');return {panel:Boolean(panel),sections:details.querySelectorAll('.content-section').length,text:panel?panel.textContent:''};})()`);
 report.invalidPreview={panel:deniedPreview.panel,sections:deniedPreview.sections,sharesEntryCopy:deniedPreview.text.includes('Thiệp hiện không khả dụng hoặc phiên đã hết hạn')};
 assert.equal(deniedPreview.panel,true,'Ngữ cảnh link không hợp lệ phải có khối giải thích');
 assert.equal(deniedPreview.sections,0,'Link không hợp lệ không được render phần nội dung nào');
 assert.ok(report.guestPreviewSections>deniedPreview.sections,'Phép so phải có ý nghĩa: ngữ cảnh hợp lệ render nhiều hơn ngữ cảnh link sai');
 assert.equal(report.invalidPreview.sharesEntryCopy,true,'Thiếu câu chữ dùng chung của trang thiệp');
 await screenshot('editor-preview-invalid');

 // 6. Lưu nháp: payload gửi lên giữ thứ tự đã đổi và content schema 2.
 await evaluate(`(()=>{document.querySelector('.section-editor form').requestSubmit();return true;})()`);
 await until(`window.__saved!==null`);
 const saved=await evaluate('window.__saved');
 report.savedMeta={templateVersion:saved.templateVersion,contentSchemaVersion:saved.contentSchemaVersion,sections:saved.sections.length};
 assert.equal(saved.templateVersion,1);
 assert.equal(saved.contentSchemaVersion,2,'Editor phải gửi content schema 2');
 const savedIntro=saved.sections.find(section=>section.kind==='INTRO');
 const savedFamily=saved.sections.find(section=>section.kind==='FAMILY');
 report.savedOrder={people:savedIntro.payload.people.map(person=>person.name),groups:savedFamily.payload.groups.map(group=>group.label)};
 assert.deepEqual(savedIntro.payload.people.map(person=>person.name),['Người B','Người A'],'Payload lưu phải theo thứ tự người đã đổi');
 assert.deepEqual(savedFamily.payload.groups.map(group=>group.label),['Nhóm Hai','Nhóm Một'],'Payload lưu phải theo thứ tự nhóm đã đổi');

 // 6b. T18: hàng TIMELINE cũ lưu được khi chưa đặt tên mốc, giữ nguyên startsAt và gửi timeline rỗng.
 const savedLegacy=saved.sections.find(section=>section.kind==='TIMELINE'&&section.startsAt==='2027-12-21T04:00:00Z');
 report.savedLegacyTimeline=savedLegacy?{timelineLength:(savedLegacy.payload?.timeline??[]).length,startsAt:savedLegacy.startsAt}:null;
 assert.ok(savedLegacy,'Hàng TIMELINE cũ phải được gửi lên khi lưu');
 assert.equal((savedLegacy.payload?.timeline??[]).length,0,'Mốc gốc chưa đặt tên không được gửi thành mốc chi tiết');
 assert.equal(savedLegacy.startsAt,'2027-12-21T04:00:00Z','Ngày giờ cũ phải được giữ nguyên');
 assert.equal(await evaluate(`Boolean(document.querySelector('.section-editor .error'))`),false,'Lưu không được báo lỗi');

 // 7. T19: bỏ ngày giờ cũ của hàng TIMELINE — chỉ bật khi đã có mốc chi tiết có tên.
 const clearBefore=await evaluate(`(()=>{const b=${blockAt(6)};const button=[...b.querySelectorAll('button')].find(item=>item.textContent==='Bỏ ngày giờ cũ');return button?{disabled:button.disabled}:null;})()`);
 report.legacyClear=clearBefore;
 assert.ok(clearBefore,'Hàng cũ phải có nút bỏ ngày giờ cũ');
 assert.equal(clearBefore.disabled,true,'Chưa có mốc chi tiết thì không được bỏ ngày giờ cũ');
 await evaluate(`(()=>{const b=${blockAt(6)};const button=[...b.querySelectorAll('button')].find(item=>item.textContent==='Thêm mốc');button.click();return true;})()`);
 await wait(200);
 // Điền mốc mới bằng setter gốc để React nhận đúng sự kiện input.
 await evaluate(`(()=>{const b=${blockAt(6)};const rows=[...b.querySelectorAll('.section-payload-item')];const inputs=[...rows[1].querySelectorAll('input')];const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;const date=inputs.find(input=>input.type==='datetime-local');setter.call(date,'2027-12-22T10:00');date.dispatchEvent(new Event('input',{bubbles:true}));const title=inputs.find(input=>input.type!=='datetime-local');setter.call(title,'Mốc mới');title.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
 await wait(250);
 const clearReady=await evaluate(`(()=>{const b=${blockAt(6)};const button=[...b.querySelectorAll('button')].find(item=>item.textContent==='Bỏ ngày giờ cũ');return {disabled:button.disabled,rows:b.querySelectorAll('.section-payload-item').length};})()`);
 report.legacyClearReady=clearReady;
 assert.equal(clearReady.rows,2,'Phải có mốc gốc và mốc chi tiết trước khi bỏ');
 assert.equal(clearReady.disabled,false,'Có mốc chi tiết rồi thì nút phải bật');
 await evaluate(`(()=>{const b=${blockAt(6)};const button=[...b.querySelectorAll('button')].find(item=>item.textContent==='Bỏ ngày giờ cũ');button.click();return true;})()`);
 await wait(250);
 const cleared=await evaluate(`(()=>{const b=${blockAt(6)};return {rows:b.querySelectorAll('.section-payload-item').length,hasButton:Boolean([...b.querySelectorAll('button')].find(item=>item.textContent==='Bỏ ngày giờ cũ')),legacyNote:Boolean(b.querySelector('.section-legacy-note'))};})()`);
 report.legacyCleared=cleared;
 assert.equal(cleared.rows,1,'Chỉ còn mốc chi tiết sau khi bỏ ngày giờ cũ');
 assert.equal(cleared.hasButton,false,'Đã bỏ ngày giờ cũ thì nút phải biến mất');
 assert.equal(cleared.legacyNote,false,'Không còn mốc gốc');
 await evaluate('window.__saved=null');
 await evaluate(`(()=>{document.querySelector('.section-editor form').requestSubmit();return true;})()`);
 await until(`window.__saved!==null`);
 const savedAfterClear=await evaluate('window.__saved');
 const clearedRow=savedAfterClear.sections.find(section=>section.title==='Mốc hàng cũ');
 report.legacyClearedSaved=clearedRow?{startsAt:clearedRow.startsAt,titles:clearedRow.payload.timeline.map(item=>item.title)}:null;
 assert.ok(clearedRow,'Phải lưu được mục TIMELINE không còn starts_at');
 assert.equal(clearedRow.startsAt,null,'Ngày giờ cũ phải được bỏ khỏi payload');
 assert.equal(clearedRow.payload.timeline.length,1,'Chỉ giữ mốc chi tiết');
 assert.equal(clearedRow.payload.timeline[0].title,'Mốc mới');
 assert.equal(await evaluate(`Boolean(document.querySelector('.section-editor .error'))`),false,'Lưu sau khi bỏ ngày giờ cũ không được báo lỗi');

 assert.deepEqual(errors,[],'Không được có exception trong browser');
 writeFileSync(`${directory}/report.json`,JSON.stringify(report,null,2));
 console.log(`PASS: editor QA — 7 mục nạp đúng; cảnh báo mục rỗng hiện/mất đúng, không báo nhầm hàng cũ startsAt; đổi thứ tự người+nhóm đổi cả UI và payload lưu; nút biên bị disabled; xem trước đủ 3 ngữ cảnh (lời mời riêng có mốc PRIVATE, thiệp chung ẩn mốc PRIVATE, link không hợp lệ không render phần nào và dùng chung câu chữ với trang thiệp); hàng TIMELINE cũ lưu được khi chưa đặt tên mốc; bỏ được ngày giờ cũ khi đã có mốc chi tiết (startsAt=null, giữ mốc); gửi contentSchemaVersion=2. Artifacts: ${directory}`);
}finally{socket?.close();browser.kill();}