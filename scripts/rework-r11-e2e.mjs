// R11 — browser→DB E2E trên stack QA disposable (mặc định http://localhost:8099).
// KHÔNG mock API: admin đăng nhập thật, tạo thiệp DEMO (design + sections có mốc PRIVATE/PUBLIC,
// publish, sự kiện, khách, link), khách mở link/i → mở thiệp → gửi RSVP + lời chúc qua UI thật,
// admin duyệt lời chúc qua UI, rồi kiểm payload + trang public không lộ mốc PRIVATE.
// Kiểm DB (chỉ đọc) và grep curl do wrapper PowerShell chạy kèm — xem .qa-artifacts/rework/R11/.
// Dùng: node scripts/rework-r11-e2e.mjs   (đổi stack bằng R11_ORIGIN)
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';

const origin=process.env.R11_ORIGIN??'http://localhost:8099';
const directory=resolve('.qa-artifacts/rework/R11');mkdirSync(directory,{recursive:true});
const env=Object.fromEntries(readFileSync('.env','utf8').split(/\r?\n/).filter(line=>/^[^#=]+=/.test(line)).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
assert.ok(env.ADMIN_USERNAME&&env.ADMIN_PASSWORD,'Thiếu ADMIN_USERNAME/ADMIN_PASSWORD trong .env');
const chrome=process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser=spawn(chrome,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${directory}/chrome-r11`,'--remote-debugging-port=9239','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));

let ready=false;
for(let i=0;i<90;i++){try{if((await fetch(`${origin}/api/v1/health`)).ok){ready=true;break;}}catch{}await wait(500);}
assert.ok(ready,'Stack QA chưa sẵn sàng: '+origin);

let socket;
try{
 let version=null;
 for(let i=0;i<80;i++){try{version=await(await fetch('http://127.0.0.1:9239/json/version')).json();break;}catch{await wait(250);}}
 assert.ok(version,'Chrome DevTools did not start');
 socket=new WebSocket(version.webSocketDebuggerUrl);
 await new Promise((res,rej)=>{socket.onopen=res;socket.onerror=rej;});
 let serial=0;const pending=new Map();const exceptions=[];
 socket.onmessage=event=>{
  const m=JSON.parse(event.data);
  if(m.method==='Page.javascriptDialogOpening'){void raw('Page.handleJavaScriptDialog',{accept:true},m.sessionId).catch(()=>{});}
  if(m.method==='Runtime.exceptionThrown')exceptions.push(JSON.stringify(m.params.exceptionDetails).slice(0,500));
  if(m.id&&pending.has(m.id)){const t=pending.get(m.id);pending.delete(m.id);m.error?t.reject(Error(JSON.stringify(m.error))):t.resolve(m.result);}
 };
 const raw=(method,params={},sessionId)=>new Promise((res,rej)=>{const id=++serial;const timeout=setTimeout(()=>{pending.delete(id);rej(Error('CDP timeout: '+method));},45000);pending.set(id,{resolve:v=>{clearTimeout(timeout);res(v);},reject:e=>{clearTimeout(timeout);rej(e);}});socket.send(JSON.stringify(sessionId?{id,method,params,sessionId}:{id,method,params}));});
 const makePage=async()=>{
  const {browserContextId}=await raw('Target.createBrowserContext');
  const {targetId}=await raw('Target.createTarget',{url:'about:blank',browserContextId});
  const {sessionId}=await raw('Target.attachToTarget',{targetId,flatten:true});
  const cmd=(method,params)=>raw(method,params,sessionId);
  await cmd('Page.enable');await cmd('Runtime.enable');
  const evaluate=async expression=>{const r=await cmd('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails).slice(0,400));return r.result.value;};
  const until=async(expression,label)=>{for(let i=0;i<300;i++){if(await evaluate(`Boolean(${expression})`))return;await wait(100);}throw Error('Timeout: '+(label??expression));};
  const navigate=url=>cmd('Page.navigate',{url});
  const metrics=(width,height)=>cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});
  const screenshot=async name=>{const r=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${directory}/${name}.png`,Buffer.from(r.data,'base64'));};
  return {cmd,evaluate,until,navigate,metrics,screenshot};
 };
const admin=await makePage();
 const guest=await makePage();

 // 1. Admin đăng nhập thật + tạo dữ liệu DEMO qua API mà UI dùng (cùng origin, session thật).
 await admin.navigate(`${origin}/admin/login`);
 await admin.until(`location.origin===${JSON.stringify(origin)}&&document.readyState==='complete'`,'admin login page');
 const setup=await admin.evaluate(`(async()=>{
  const csrf=async()=>{const c=await (await fetch('/api/v1/session/csrf')).json();return {[c.headerName]:c.token};};
  const api=async(path,method='GET',body)=>{const headers=method==='GET'?{}:Object.assign(await csrf(),{'Content-Type':'application/json'});const r=await fetch('/api/v1'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});const text=await r.text();if(!r.ok)throw Error(method+' '+path+' → '+r.status+' '+text.slice(0,200));return text?JSON.parse(text):null;};
  const login=await fetch('/api/v1/auth/login',{method:'POST',headers:Object.assign(await csrf(),{'Content-Type':'application/x-www-form-urlencoded'}),body:new URLSearchParams(${JSON.stringify({username:env.ADMIN_USERNAME,password:env.ADMIN_PASSWORD})})});
  if(login.status!==204)throw Error('Đăng nhập thất bại: '+login.status);
  const me=await api('/auth/me');
  let w=await api('/admin/wedding');
  await api('/admin/wedding/design','PUT',{names:'Minh & An (DEMO R11)',message:'Lời mời minh họa cho kiểm thử R11.',theme:'ELEGANT',accent:'OLIVE',story:'Câu chuyện minh họa trên stack QA.',footer:'Cảm ơn bạn.',showStory:true,musicId:null,showCountdown:false,expectedVersion:w.version});
  w=await api('/admin/wedding');
  const sections=[
   {kind:'INTRO',audience:'PUBLIC',enabled:true,title:'Giới thiệu hai bạn',body:'',startsAt:null,color:null,payload:{people:[{name:'Minh',role:'Chú rể',note:''},{name:'An',role:'Cô dâu',note:''}]}},
   {kind:'TIMELINE',audience:'PUBLIC',enabled:true,title:'Mốc lịch trình',body:'',startsAt:null,color:null,payload:{timeline:[
    {at:'2027-12-20T09:00:00Z',title:'Đón khách DEMO',note:'Giờ đón khách minh họa.',venue:'Sân vườn Olive',audience:'PUBLIC',tentative:false},
    {at:'2027-12-19T23:30:00Z',title:'Lễ gia tiên DEMO',note:'',venue:'',audience:'PRIVATE',tentative:true}]}},
   {kind:'DRESS_CODE',audience:'PUBLIC',enabled:true,title:'Trang phục',body:'Tông sáng, thoải mái.',startsAt:null,color:null,payload:{palette:[{name:'Trắng ngà',color:'#fffdf9'}],avoid:''}}
  ];
  await api('/admin/wedding/sections','PUT',{sections,templateVersion:1,contentSchemaVersion:2,expectedVersion:w.version});
  w=await api('/admin/wedding');
  await api('/admin/wedding/publish','POST',{expectedVersion:w.version});
  w=await api('/admin/wedding');
  await api('/admin/access-policy','PUT',{mode:'MANUAL_OPEN',expectedVersion:w.version});
  const event=await api('/admin/events','POST',{title:'Lễ DEMO R11',startAt:new Date(Date.now()+30*864e5).toISOString(),deadline:new Date(Date.now()+20*864e5).toISOString(),venue:'Nhà hàng DEMO',address:'Địa chỉ minh họa R11',timezone:'Asia/Ho_Chi_Minh',capacity:60,expectedVersion:0});
  await api('/admin/events/'+event.id+'/publish','POST',{expectedVersion:0});
  const invite=await api('/admin/guests','POST',{displayName:'Khách E2E R11',groupName:'QA-R11',salutation:'Kính mời',assignments:[{eventId:event.id,maxPeople:2}]});
  const link=await api('/admin/invitations/'+invite.id+'/link-reveal','POST');
  return {user:me.username,eventId:event.id,inviteId:invite.id,link:link.url};
 })()`);
 assert.equal(setup.user,env.ADMIN_USERNAME,'Phiên admin không đúng');
 assert.ok(setup.link.includes('/i/'),'Link mời không đúng dạng: '+setup.link);
 console.log('[setup] admin='+setup.user+' event='+setup.eventId+' invite='+setup.inviteId+' link=OK');
// 2. Admin xem editor thật (dữ liệu đã lưu) — ảnh 1440 + 390.
 for(const [width,height] of [[1440,900],[390,844]]){
  await admin.metrics(width,height);
  await admin.navigate(`${origin}/admin/wedding`);
  await admin.until(`document.querySelectorAll('.section-editor-item').length>=3`,'editor rows');
  await admin.evaluate(`document.querySelector('.section-editor')?.scrollIntoView({block:'start'});true`);
  await wait(400);
  assert.ok(await admin.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),'Tràn ngang editor '+width);
  await admin.screenshot(`r11-admin-editor-${width}`);
 }
 console.log('[admin] editor hiển thị 3 mục nội dung đã lưu, không tràn ngang 1440/390');

 // 3. Khách: mở link /i/token → redeem → /invitation/{id} → mở thiệp.
 await guest.metrics(390,844);
 await guest.navigate(setup.link);
 await guest.until(`document.body.textContent.includes('Tiếp tục tới lời mời')`,'redeem button');
 // Chờ hydration xong rồi click có thử lại: nút SSR có thể chưa gắn handler khi vừa hiện chữ.
 await wait(700);
 let redeemed=false;
 for(let attempt=0;attempt<6&&!redeemed;attempt++){
  await guest.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Tiếp tục tới lời mời')||x.textContent.includes('Đang kiểm tra lời mời'));if(b&&!b.disabled)b.click();return true;})()`);
  for(let i=0;i<40&&!redeemed;i++){redeemed=await guest.evaluate(`location.pathname.startsWith('/invitation/')`);if(!redeemed)await wait(200);}
 }
 if(!redeemed){const st=await guest.evaluate(`({path:location.pathname,text:document.body.textContent.slice(0,300)})`);throw Error('Redeem không chuyển trang: '+JSON.stringify(st));}
 await guest.until(`document.querySelector('.invitation-entry')`,'entry envelope');
 let opened=false;
 for(let attempt=0;attempt<8&&!opened;attempt++){
  await guest.evaluate(`(()=>{const b=[...document.querySelectorAll('.invitation-entry button')].find(x=>x.textContent.includes('Mở thiệp')&&!x.classList.contains('secondary'));if(b&&!b.disabled)b.click();return true;})()`);
  for(let i=0;i<40&&!opened;i++){opened=await guest.evaluate(`Boolean(document.querySelector('.wedding-canvas')&&document.querySelector('.rsvp-form'))`);if(!opened)await wait(200);}
 }
 assert.ok(opened,'Không mở được thiệp qua nút Mở thiệp');
 await wait(800);
 await wait(500);
 await guest.screenshot('r11-guest-opened-390');
 console.log('[guest] mở thiệp qua link riêng — thấy form RSVP');

 // 4. Khách gửi RSVP qua UI thật (requestSubmit như browser-qa.mjs), thử lại nếu handler chưa gắn.
 let rsvpSaved=false;
 for(let attempt=0;attempt<6&&!rsvpSaved;attempt++){
  await guest.evaluate(`(()=>{const form=document.querySelector('.rsvp-form');const details=form.closest('details');if(details)details.open=true;form.requestSubmit();return true;})()`);
  for(let i=0;i<30&&!rsvpSaved;i++){rsvpSaved=await guest.evaluate(`document.body.textContent.includes('Đã lưu phản hồi')`);if(!rsvpSaved)await wait(200);}
 }
 assert.ok(rsvpSaved,'RSVP không lưu được qua UI');
 console.log('[guest] RSVP ATTENDING đã lưu qua UI');

 // 5. Khách gửi lời chúc qua UI thật.
 let wishSent=false;
 for(let attempt=0;attempt<6&&!wishSent;attempt++){
  await guest.evaluate(`(()=>{const book=document.querySelector('.wish-book');const d=book.querySelector('details');if(d)d.open=true;const ta=book.querySelector('form.wish-form textarea');const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;setter.call(ta,'Chúc mừng hai bạn — lời chúc E2E R11!');ta.dispatchEvent(new Event('input',{bubbles:true}));book.querySelector('form.wish-form').requestSubmit();return true;})()`);
  for(let i=0;i<30&&!wishSent;i++){wishSent=await guest.evaluate(`document.body.textContent.includes('Đã gửi lời chúc')`);if(!wishSent)await wait(200);}
 }
 assert.ok(wishSent,'Lời chúc không gửi được qua UI');
 await wait(400);
 await guest.screenshot('r11-guest-rsvp-wish-390');
 await guest.metrics(1440,900);await wait(500);await guest.screenshot('r11-guest-rsvp-wish-1440');
 // Đúng thiết kế R02/R-A: khách đã mở thiệp ĐƯỢC xem mốc PRIVATE; chỉ thiệp public mới ẩn.
 const guestSeesPrivate=await guest.evaluate(`document.body.textContent.includes('Lễ gia tiên DEMO')`);
 assert.ok(guestSeesPrivate,'Khách không thấy mốc PRIVATE dù đã mở thiệp (lệch thiết kế quyền riêng tư)');
 console.log('[guest] lời chúc đã gửi (chờ duyệt); khách thấy mốc PRIVATE như thiết kế (public mới ẩn)');
 // 6. Admin duyệt lời chúc qua UI (thử lại nếu handler chưa gắn).
 await admin.metrics(1440,900);
 await admin.navigate(`${origin}/admin/wishes`);
 await admin.until(`document.querySelectorAll('.wish-queue-item').length>=1`,'hàng chờ lời chúc');
 let approved=false;
 for(let attempt=0;attempt<7&&!approved;attempt++){
  await admin.evaluate(`(()=>{const row=[...document.querySelectorAll('.wish-queue-item')].find(r=>r.querySelector('textarea')&&r.querySelector('textarea').value.includes('E2E R11'));if(!row)return true;const b=[...row.querySelectorAll('button')].find(x=>x.textContent.trim()==='Duyệt');if(b&&!b.disabled)b.click();return true;})()`);
  for(let i=0;i<30&&!approved;i++){approved=await admin.evaluate(`[...document.querySelectorAll('.wish-queue-item')].some(r=>r.querySelector('textarea')&&r.querySelector('textarea').value.includes('E2E R11')&&r.querySelector('.wish-state')&&r.querySelector('.wish-state').textContent.trim()==='Đã duyệt')`);if(!approved)await wait(200);}
 }
 assert.ok(approved,'Không duyệt được lời chúc qua UI');
 await admin.screenshot('r11-admin-wish-approved-1440');
 console.log('[admin] duyệt lời chúc qua UI — trạng thái Đã duyệt');

 // 7. Payload public (fetch thật, không đăng nhập) + trang public render.
 const payload=await guest.evaluate(`(async()=>{const r=await fetch('/api/v1/public/weddings/our-wedding');if(!r.ok)return {status:r.status};return await r.json();})()`);
 assert.ok(!payload.status,'Public payload lỗi: '+JSON.stringify(payload).slice(0,200));
 const payloadText=JSON.stringify(payload);
 assert.ok(!payloadText.includes('Lễ gia tiên DEMO'),'Payload public RÒ mốc PRIVATE');
 assert.ok(payloadText.includes('Đón khách DEMO'),'Payload public THIẾU mốc PUBLIC');
 console.log('[public] payload không chứa "Lễ gia tiên DEMO", có "Đón khách DEMO"');
 for(const [width,height] of [[390,844],[1440,900]]){
  await guest.metrics(width,height);
  await guest.navigate(`${origin}/w/our-wedding`);
  await guest.until(`document.querySelectorAll('.content-section').length>=2`,'sections public');
  await wait(500);
  const state=await guest.evaluate(`({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,hasPublic:document.body.textContent.includes('Đón khách DEMO'),hasPrivate:document.body.textContent.includes('Lễ gia tiên DEMO')})`);
  assert.ok(!state.overflow,'Tràn ngang trang public '+width);
  assert.ok(state.hasPublic,'Trang public thiếu mốc PUBLIC');
  assert.ok(!state.hasPrivate,'Trang public hiển thị mốc PRIVATE');
  await guest.screenshot(`r11-public-${width}`);
 }
 console.log('[public] trang /w/our-wedding 390/1440: đủ mốc công khai, không lộ mốc riêng, không tràn ngang');

 assert.equal(exceptions.length,0,'Có exception trong trang: '+exceptions.join(' | '));
 writeFileSync(`${directory}/e2e-report.json`,JSON.stringify({origin,setup:{user:setup.user,eventId:setup.eventId,inviteId:setup.inviteId},exceptions:exceptions.length,at:new Date().toISOString()},null,2));
 console.log('PASS: R11 E2E browser→DB (login thật, thiệp DEMO, RSVP + lời chúc qua UI, duyệt, payload public sạch)');
}finally{socket?.close();browser.kill();}