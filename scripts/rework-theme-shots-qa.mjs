// R03+: chụp thiệp public (fixture DEMO) theo 3 theme × 390/768/1440 để so sánh trước/sau.
// Mọi /api/v1 mô phỏng trong trang; không backend, không dữ liệu thật.
// Dùng: node scripts/rework-theme-shots-qa.mjs <prefix>   (prefix: before|after)
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const prefix=process.argv[2]??'shot';
const origin=process.env.INVITATION_QA_ORIGIN??'http://localhost:3000';
const directory=resolve(process.env.REWORK_SHOTS_DIR??'.qa-artifacts/rework/R03');mkdirSync(directory,{recursive:true});
const browser=spawn(process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run',`--user-data-dir=${directory}/chrome-${prefix}`,'--remote-debugging-port=9244','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let socket;
try{
 let targets;
 for(let i=0;i<80;i++){try{targets=await(await fetch('http://127.0.0.1:9244/json')).json();break;}catch{await wait(250);}}
 assert.ok(targets,'Chrome DevTools did not start');
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((res,rej)=>{socket.onopen=res;socket.onerror=rej;});
 let serial=0;const pending=new Map();
 socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const t=pending.get(m.id);pending.delete(m.id);m.error?t.reject(m.error):t.resolve(m.result);}};
 const command=(method,params={})=>new Promise((res,rej)=>{const id=++serial;const timeout=setTimeout(()=>{pending.delete(id);rej(Error('CDP timeout: '+method));},30000);pending.set(id,{resolve:v=>{clearTimeout(timeout);res(v);},reject:e=>{clearTimeout(timeout);rej(e);}});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const until=async expression=>{for(let i=0;i<200;i++){if(await evaluate(`Boolean(${expression})`))return;await wait(100);}throw Error('Timeout: '+expression);};
 const screenshot=async name=>{const r=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${directory}/${name}.png`,Buffer.from(r.data,'base64'));};
 const metrics=(width,height)=>command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});
 const picture='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#b3bca8"/><circle cx="450" cy="400" r="160" fill="#52664c"/></svg>');
 // WAV câm ~0.2s để music control có trạng thái playing thật trong headless (data URI, không tải ngoài).
 const silentWav=(()=>{const rate=8000,samples=1600;const header=Buffer.alloc(44);header.write('RIFF',0);header.writeUInt32LE(36+samples*2,4);header.write('WAVE',8);header.write('fmt ',12);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(samples*2,40);return 'data:audio/wav;base64,'+Buffer.concat([header,Buffer.alloc(samples*2)]).toString('base64');})();
 const heroNone=process.env.REWORK_HERO==='none';
 const sectionsMode=process.env.REWORK_PAGE==='sections';
 const sparse=process.env.REWORK_SPARSE==='1';
 const calendarMode=process.env.REWORK_PAGE==='calendar';
 const pad2=n=>String(n).padStart(2,'0');
 const vnNow=new Date(Date.now()+7*60*60*1000);
 const todayIso=`${vnNow.getUTCFullYear()}-${pad2(vnNow.getUTCMonth()+1)}-${pad2(vnNow.getUTCDate())}T16:30:00Z`;
 const nextMonthDate=new Date(Date.UTC(vnNow.getUTCFullYear(),vnNow.getUTCMonth()+1,15));
 const nextDayLabel=`15/${pad2(nextMonthDate.getUTCMonth()+1)}/${nextMonthDate.getUTCFullYear()}`;
 const baseEvent=(id,title,start,state)=>({id,title,start_at:start,timezone:'Asia/Ho_Chi_Minh',deadline:'2030-01-01T00:00:00Z',venue:'Sảnh DEMO',address:'12 Lê Lợi',state,max_people:4,status:null,total_people:null,note:null,event_note:null,response_version:0,rsvp_open:true,maps_url:null,dress_code:null,parking:null,change_notice:null,revision:1});
 const calendarEvents=calendarMode?[
  baseEvent('today','Tiệc hôm nay DEMO',todayIso,'PUBLISHED'),
  baseEvent('next-a','Tiệc tháng sau DEMO',`${nextMonthDate.toISOString().slice(0,10)}T03:00:00Z`,'PUBLISHED'),
  baseEvent('next-b','Tiệc đã hủy DEMO',`${nextMonthDate.toISOString().slice(0,10)}T06:00:00Z`,'CANCELLED')
 ]:[baseEvent('e1','Tiệc DEMO','2027-12-20T10:00:00Z','PUBLISHED')];
 const motionMode=process.env.REWORK_PAGE==='motion';
 const r09Mode=process.env.REWORK_PAGE==='r09';
 const wishFeed=(motionMode||r09Mode)?{items:[
  {pinned:true,id:'w1',display_name:'Chị Lan DEMO',message:'Chúc hai bạn trăm năm hạnh phúc, vạn sự như ý!',created_at:'2026-10-01T02:00:00Z'},
  {pinned:false,id:'w2',display_name:'Anh Minh DEMO',message:'Chúc mừng ngày trọng đại, chúc hai bạn bên nhau trọn đời.',created_at:'2026-10-02T03:30:00Z'}
 ],nextCursor:null}:{items:[],nextCursor:null};
 const r09Events=r09Mode?[baseEvent('ev1','Tiệc DEMO',`${nextMonthDate.toISOString().slice(0,10)}T03:00:00Z`,'PUBLISHED')]:null;
 const r09GiftView=r09Mode?{enabled:true,mode:'SINGLE',recipients:[{label:'Người nhận DEMO',description:'Quét mã QR để gửi quà mừng.',assetId:'qa-first'}]}:{enabled:false};
 const design={names:'Trần Thanh Bình & Lê Hải Đăng',message:'Trân trọng mời bạn chung vui trong ngày hạnh phúc của chúng mình.',theme:'ELEGANT',accent:'OLIVE',story:'Chúng mình gặp nhau ở một quán cà phê nhỏ.',footer:'Cảm ơn bạn đã đến.',show_story:true,heroUrl:heroNone?null:picture,albumUrls:heroNone?[]:[picture,picture,picture,picture],show_countdown:true,musicUrl:silentWav,layout:[{section:'MUSIC',enabled:true},{section:'COUNTDOWN',enabled:true},{section:'STORY',enabled:true},{section:'CONTENT',enabled:true},{section:'ALBUM',enabled:!heroNone},{section:'THANKS',enabled:true}],sections:[
  {kind:'INTRO',audience:'PUBLIC',enabled:true,title:'Giới thiệu hai bạn',body:'Giữa hàng triệu người trên thế gian, thật may mắn vì chúng mình đã tìm thấy nhau.',startsAt:null,color:null,payload:{people:[{name:'Trần Thanh Bình',role:'Cô dâu',note:'Thích hoa dại.'},{name:'Lê Hải Đăng',role:'Chú rể',note:'Mê cà phê.'}]}},
  {kind:'FAMILY',audience:'PUBLIC',enabled:true,title:'Gia đình',body:'Nơi khởi nguồn của yêu thương, tổ ấm nhỏ.',startsAt:null,color:null,payload:{groups:[{label:'Nhà gái',members:[{name:'Ông Trần Quốc Tuấn',note:'Mẹ'}]},{label:'Nhà trai',members:[{name:'Ông Lê Văn An',note:'Bố'}]}]}},
  {kind:'CEREMONY',audience:'PUBLIC',enabled:true,title:'Nghi lễ riêng',body:'',startsAt:null,color:null,payload:{items:[{title:'Lễ gia tiên',lead:'Kính mời gia đình.',time:null,venue:'Từ gia',address:'12 Lê Lợi',directions:''}]}},
  {kind:'TIMELINE',audience:'PUBLIC',enabled:true,title:'Mốc lịch trình',body:'',startsAt:null,color:null,payload:{timeline:[{at:'2027-12-20T09:00:00Z',title:'Đón khách',note:'',venue:'Sảnh',audience:'PUBLIC',tentative:false},{at:'2027-12-20T11:00:00Z',title:'Nghi lễ',note:'',venue:'Sảnh',audience:'PUBLIC',tentative:false}]}},
  {kind:'DRESS_CODE',audience:'PUBLIC',enabled:true,title:'Trang phục',body:'Tông sáng dịu, tránh màu quá chói.',startsAt:null,color:null,payload:{palette:[{name:'Trắng ngà',color:'#fffdf9'},{name:'Xanh olive',color:'#52664c'}],avoid:'Đen toàn tập'}}
 ]};
 if(sparse){design.sections=design.sections.map(s=>({...s,payload:{...s.payload,people:s.payload?.people?.slice(0,1),groups:s.payload?.groups?.slice(0,1),items:s.payload?.items?.slice(0,1),timeline:s.payload?.timeline?.slice(0,1),palette:s.payload?.palette?.slice(0,1)}}));}
 await command('Page.enable');await command('Runtime.enable');
 await command('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.design=${JSON.stringify(design)};
  const nativeFetch=window.fetch;
  window.fetch=async function(input,init){
   const url=String(input);if(!url.startsWith('/api/v1/'))return nativeFetch(input,init);
   if(url.includes('/gifts/assets/')){if(window.assetFailure||window.downloadFailure)return new Response('{}',{status:403,headers:{'Content-Type':'application/json'}});return new Response(new Uint8Array([137,80,78,71]),{status:200,headers:{'Content-Type':'image/png'}});}
   if(url.includes('/wishes')||url.includes('/approved-wishes'))return new Response(JSON.stringify(window.r09EmptyWishes?{items:[],nextCursor:null}:${JSON.stringify(wishFeed)}),{status:200,headers:{'Content-Type':'application/json'}});
   if(url.includes('/gift'))return new Response(JSON.stringify(${JSON.stringify(r09GiftView)}),{status:200,headers:{'Content-Type':'application/json'}});
   if(url.includes('/guest/invitations/')){
    if(url.endsWith('/state'))return new Response(JSON.stringify({opened:true}),{status:200,headers:{'Content-Type':'application/json'}});
    if(url.endsWith('/open'))return new Response(JSON.stringify({}),{status:200,headers:{'Content-Type':'application/json'}});
    if(url.includes('/rsvp')){if(typeof init?.method==='string'&&init.method==='PUT'&&window.r09RsvpFail)return new Response(JSON.stringify({detail:'Máy chủ đang bận lưu phản hồi. Vui lòng thử lại sau ít phút.'}),{status:503,headers:{'Content-Type':'application/json'}});return new Response(JSON.stringify({}),{status:200,headers:{'Content-Type':'application/json'}});}
    return new Response(JSON.stringify({displayName:'Khách DEMO',salutation:'Trân trọng kính mời',wedding:window.design,events:${JSON.stringify(r09Events??calendarEvents)}}),{status:200,headers:{'Content-Type':'application/json'}});
   }
   if(url.includes('/public/weddings/')){const theme=new URLSearchParams(location.search).get('theme')||'ELEGANT';return new Response(JSON.stringify(Object.assign({},window.design,{theme})),{status:200,headers:{'Content-Type':'application/json'}});}
   return new Response(JSON.stringify({}),{status:200,headers:{'Content-Type':'application/json'}});
  };
 `});
 const guestMode=process.env.REWORK_PAGE==='guest';
 console.error(`[cfg] prefix=${prefix} heroNone=${heroNone} guestMode=${guestMode} sectionsMode=${sectionsMode} calendarMode=${calendarMode} motionMode=${motionMode} r09Mode=${r09Mode} sparse=${sparse} dir=${directory}`);
 if(guestMode){
  for(const [width,height] of [[390,844],[1440,900]]){
   await metrics(width,height);
   await command('Page.navigate',{url:`${origin}/invitation/r05-guest`});
   await until(`document.querySelector('.wedding-canvas')`);
   {
    const dbg=await evaluate(`JSON.stringify({countdown:!!document.querySelector('.wedding-countdown'),music:!!document.querySelector('.invitation-music-button'),entry:!!document.querySelector('.invitation-entry'),events:document.querySelectorAll('.event-card').length})`);
    const parsed=JSON.parse(dbg);
    if(!parsed.countdown||!parsed.music)throw Error('Guest thiếu countdown/music: '+dbg);
   }
   await wait(400);
   assert.ok(await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),'Tràn ngang guest '+width);
   await evaluate(`document.querySelector('.wedding-countdown').scrollIntoView({block:'center'});true`);
   await wait(300);
   await screenshot(`${prefix}-guest-countdown-${width}`);
   let playing=false;
   for(let attempt=0;attempt<8&&!playing;attempt++){
    await evaluate(`(()=>{const b=document.querySelector('.invitation-music-button');if(b)b.click();return true;})()`);
    await wait(500);
    playing=await evaluate(`(()=>{const a=document.querySelector('.invitation-music audio');return Boolean(a&&!a.paused);})()`);
   }
   if(!playing)throw Error('Guest không phát được nhạc');
   await wait(300);
   await screenshot(`${prefix}-guest-music-${width}`);
  }
 }else if(calendarMode){
  console.error(`[calendar] today=${todayIso} nextDay=${nextDayLabel}`);
  for(const [width,height] of [[390,844],[1440,900]]){
   await metrics(width,height);
   await command('Page.navigate',{url:`${origin}/invitation/r07-calendar`});
   await until(`document.querySelector('.wedding-canvas')`);
   await until(`document.querySelector('.wedding-month-calendar .calendar-day')`);
   await wait(400);
   assert.ok(await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),'Tràn ngang lịch '+width);
   const shot=async(name)=>{let saved=false;for(let attempt=0;attempt<3&&!saved;attempt++){try{await screenshot(name);saved=true;}catch(error){console.error(`[retry] ${name} lần ${attempt+1}: ${error.message}`);await wait(800);}}if(!saved)throw Error(`Không chụp được ${name}`);};
   await evaluate(`document.querySelector('.wedding-month-calendar').scrollIntoView({block:'start'});true`);
   await wait(250);
   await shot(`${prefix}-calendar-grid-${width}`);
   await evaluate(`document.querySelector('[aria-label="Tháng sau"]').click();true`);
   await wait(350);
   await shot(`${prefix}-calendar-next-${width}`);
   const dayFound=await evaluate(`(()=>{const b=[...document.querySelectorAll('.calendar-day')].find(el=>(el.getAttribute('aria-label')||'').startsWith(${JSON.stringify(nextDayLabel)}));if(!b)return false;b.click();return true;})()`);
   if(!dayFound)throw Error('Không tìm thấy ngày '+nextDayLabel);
   await wait(250);
   await evaluate(`document.querySelector('.calendar-details').scrollIntoView({block:'center'});true`);
   await wait(150);
   await shot(`${prefix}-calendar-details-${width}`);
  }
 }else if(motionMode){
  for(const [width,height] of [[390,844],[1440,900]]){
   await metrics(width,height);
   await command('Page.navigate',{url:`${origin}/invitation/r08-motion`});
   await until(`document.querySelector('.wedding-inner')`);
   const shot=async(name)=>{let saved=false;for(let attempt=0;attempt<3&&!saved;attempt++){try{await screenshot(name);saved=true;}catch(error){console.error(`[retry] ${name} lần ${attempt+1}: ${error.message}`);await wait(800);}}if(!saved)throw Error(`Không chụp được ${name}`);};
   // Frame giữa chừng của cardIn (cover mở) rồi trạng thái nghỉ, để so layout-shift.
   await shot(`${prefix}-cover-mid-${width}`);
   const layoutMid=await evaluate(`JSON.stringify({scroll:document.documentElement.scrollHeight,cover:Math.round(document.querySelector('.wedding-cover').getBoundingClientRect().height)})`);
   await wait(950);
   await shot(`${prefix}-cover-rest-${width}`);
   const layoutRest=await evaluate(`JSON.stringify({scroll:document.documentElement.scrollHeight,cover:Math.round(document.querySelector('.wedding-cover').getBoundingClientRect().height)})`);
   console.error(`[layout ${width}] mid=${layoutMid} rest=${layoutRest}`);
   // Disclosure mở: chụp ngay khi body đang vào, rồi trạng thái nghỉ.
   await evaluate(`document.querySelector('.wish-book .guest-disclosure>summary').scrollIntoView({block:'center'});true`);
   await wait(250);
   await evaluate(`document.querySelector('.wish-book .guest-disclosure>summary').click();true`);
   await shot(`${prefix}-disclosure-mid-${width}`);
   await wait(450);
   await shot(`${prefix}-disclosure-rest-${width}`);
   const anim=await evaluate(`JSON.stringify({body:getComputedStyle(document.querySelector('.wish-book .guest-disclosure-body')).animationName,wish:getComputedStyle(document.querySelector('.wish-item')).animationName,buttonTransition:getComputedStyle(document.querySelector('.wish-feed button.secondary')||document.querySelector('.wish-feed button')).transitionProperty})`);
   console.error(`[anim ${width}] ${anim}`);
   // Hover nút: đưa chuột lên nút feed để đo nâng 1px.
   await evaluate(`document.querySelector('.wish-feed').scrollIntoView({block:'center'});true`);
   await wait(250);
   const rect=JSON.parse(await evaluate(`(()=>{const b=document.querySelector('.wish-feed button.secondary')||document.querySelector('.wish-feed button');const r=b.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)});})()`));
   await command('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.x,y:rect.y,button:'none'});
   await wait(250);
   const hover=await evaluate(`JSON.stringify({transform:getComputedStyle(document.querySelector('.wish-feed button.secondary')||document.querySelector('.wish-feed button')).transform})`);
   console.error(`[hover ${width}] ${hover}`);
   await command('Input.dispatchMouseEvent',{type:'mouseMoved',x:2,y:2,button:'none'});
   // Emulate reduced-motion: kill-switch toàn cục phải tắt animation, nội dung vẫn hiện.
   await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
   await wait(200);
   const reduced=await evaluate(`JSON.stringify({body:getComputedStyle(document.querySelector('.wish-book .guest-disclosure-body')).animationName,wish:getComputedStyle(document.querySelector('.wish-item')).animationName})`);
   console.error(`[reduced ${width}] ${reduced}`);
   await shot(`${prefix}-reduced-${width}`);
   await command('Emulation.setEmulatedMedia',{features:[]});
   assert.ok(await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),'Tràn ngang motion '+width);
  }
 }else if(r09Mode){
  await command('Fetch.enable',{patterns:[{urlPattern:'*/gifts/assets/*',requestStage:'Request'}]});await command('Network.enable');await command('Network.setCacheDisabled',{cacheDisabled:true});
  const qrPrior=socket.onmessage;
  const qrPng='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.method==='Fetch.requestPaused'){void evaluate('window.assetFailure').then(fail=>command('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:fail?403:200,responseHeaders:[{name:'Content-Type',value:fail?'application/json':'image/png'},{name:'Cache-Control',value:'no-store, private'}],body:fail?'e30=':qrPng}));}else qrPrior(event);};
  for(const [width,height] of [[390,844],[1440,900]]){
   await metrics(width,height);
   const shot=async(name)=>{let saved=false;for(let attempt=0;attempt<3&&!saved;attempt++){try{await screenshot(name);saved=true;}catch(error){console.error(`[retry] ${name} lần ${attempt+1}: ${error.message}`);await wait(800);}}if(!saved)throw Error(`Không chụp được ${name}`);};
   await command('Page.navigate',{url:`${origin}/invitation/r09-states`});
   await until(`document.querySelector('.rsvp-summary')&&document.querySelector('.wish-book .guest-disclosure')`);
   await wait(400);
   assert.ok(await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),'Tràn ngang r09 '+width);
   console.error(`[r09 ${width}] chip="${await evaluate(`document.querySelector('.rsvp-chip')?.textContent??''`)}"`);
   await evaluate(`document.querySelector('.event-card .guest-disclosure>summary').scrollIntoView({block:'center'});true`);
   await wait(200);
   await shot(`${prefix}-r09-rsvp-closed-${width}`);
   await evaluate(`document.querySelector('.event-card .guest-disclosure>summary').click();true`);
   await until(`document.querySelector('.event-card .guest-disclosure[open]')`);
   await wait(350);
   await shot(`${prefix}-r09-rsvp-open-${width}`);
   await evaluate(`window.r09RsvpFail=true;true`);
   await evaluate(`(()=>{const t=document.querySelector('.event-card .rsvp-form textarea');t.focus();t.select();return true;})()`);
   await command('Input.insertText',{text:'Lời nhắn đang giữ nguyên khi lỗi.'});
   await evaluate(`(()=>{const b=[...document.querySelectorAll('.event-card .rsvp-form button')].find(b=>b.textContent.includes('Lưu xác nhận'));b.click();return true;})()`);
   await until(`document.querySelector('.event-card .rsvp-message')&&document.querySelector('.event-card .rsvp-message').textContent.length>0`);
   const kept=await evaluate(`document.querySelector('.event-card .rsvp-form textarea').value`);
   assert.equal(kept,'Lời nhắn đang giữ nguyên khi lỗi.','503 phải giữ nguyên bản nháp');
   await evaluate(`document.querySelector('.event-card .rsvp-form').scrollIntoView({block:'center'});true`);
   await wait(200);
   await shot(`${prefix}-r09-rsvp-error-${width}`);
   await evaluate(`window.r09RsvpFail=false;true`);
   await evaluate(`(()=>{const b=[...document.querySelectorAll('.event-card .rsvp-form button')].find(b=>b.textContent.includes('Lưu xác nhận'));b.click();return true;})()`);
   await until(`document.querySelector('.event-card .rsvp-message')?.textContent.includes('Đã lưu phản hồi')`);
   await wait(250);
   await shot(`${prefix}-r09-rsvp-success-${width}`);
   await evaluate(`document.querySelector('.wish-book .wish-list').scrollIntoView({block:'center'});true`);
   await wait(400);
   await shot(`${prefix}-r09-wish-feed-${width}`);
   await evaluate(`window.r09EmptyWishes=true;[...document.querySelectorAll('.wish-feed button')].find(b=>b.textContent.includes('Làm mới')).click();true`);
   await until(`[...document.querySelectorAll('.wish-feed .field-hint')].some(p=>p.textContent.includes('Chưa có lời chúc'))`);
   await wait(300);
   await shot(`${prefix}-r09-wish-empty-${width}`);
   await command('Page.navigate',{url:`${origin}/invitation/r09-gift`});
   await until(`document.querySelector('.gift-trigger')`);
   await wait(300);
   await evaluate(`window.assetFailure=true;true`);
   await evaluate(`document.querySelector('.gift-trigger').click();true`);
   await until(`document.querySelector('.gift-dialog [role=alert]')`);
   await wait(250);
   await shot(`${prefix}-r09-gift-error-${width}`);
   await evaluate(`window.assetFailure=false;true`);
   await evaluate(`[...document.querySelectorAll('.gift-dialog button')].find(b=>b.textContent==='Thử tải lại ảnh').click();true`);
   await until(`document.querySelector('.gift-qr')&&document.querySelector('.gift-qr').naturalWidth>0`);
   await wait(250);
   await shot(`${prefix}-r09-gift-open-${width}`);
   await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
   await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
   await until(`!document.querySelector('.gift-dialog')`);
  }
 }else if(sectionsMode){
  for(const [width,height] of [[390,844],[1440,900]]){
   await metrics(width,height);
   await command('Page.navigate',{url:`${origin}/w/rework-demo?theme=ELEGANT`});
   await until(`document.querySelector('.content-dress-code')&&document.querySelectorAll('.content-section').length>=5`);
   await wait(300);
   assert.ok(await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),'Tràn ngang sections '+width);
   for(const [selector,name] of [['.content-intro','intro'],['.content-family','family'],['.content-ceremony','ceremony'],['.content-timeline','timeline'],['.content-dress-code','dress']]){
    await evaluate(`(()=>{const el=document.querySelector('${selector}');el.classList.add('is-visible');el.scrollIntoView({block:'start'});return true;})()`);
    await wait(250);
    let saved=false;
    for(let attempt=0;attempt<3&&!saved;attempt++){
     try{await screenshot(`${prefix}-section-${name}-${width}`);saved=true;}
     catch(error){console.error(`[retry] ${name}-${width} lần ${attempt+1}: ${error.message}`);await wait(800);}
    }
    if(!saved)throw Error(`Không chụp được ${name}-${width}`);
   }
  }
 }else{
  const themeFilter=(process.env.REWORK_THEMES??'ELEGANT,TRADITIONAL,MODERN').split(',').map(item=>item.trim().toUpperCase()).filter(Boolean);
  for(const theme of themeFilter){
   for(const [width,height] of [[390,844],[768,1024],[1440,900]]){
    await metrics(width,height);
    console.error(`[step] ${prefix} ${theme} ${width} navigate`);
    await command('Page.navigate',{url:`${origin}/w/rework-demo?theme=${theme}`});
    await until(`document.querySelector('.content-dress-code')&&document.querySelectorAll('.content-section').length>=5`);
    console.error(`[step] ${prefix} ${theme} ${width} loaded`);
    await wait(400);
    assert.ok(await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),'Tràn ngang ở '+theme+' '+width);
    await evaluate(`window.scrollTo(0,0);true`);await wait(250);await screenshot(`${prefix}-cover-${theme.toLowerCase()}-${width}`);
    if(width===1440&&!heroNone){
     const albumStep=await evaluate(`(()=>{const el=document.querySelector('.album-main');if(!el)return 'MISSING:'+JSON.stringify({album:!!document.querySelector('.wedding-album'),coverPhoto:!!document.querySelector('.cover-photo'),body:!!document.querySelector('.wedding-body'),sections:document.querySelectorAll('.content-section').length});el.scrollIntoView({block:'center'});return 'OK';})()`);
     if(albumStep!=='OK')throw Error('Thiếu album: '+albumStep);
     await wait(300);
     await screenshot(`${prefix}-album-${theme.toLowerCase()}-1440`);
     let clickStep='MISSING';
     for(let attempt=0;attempt<6&&clickStep!=='OK';attempt++){
      clickStep=await evaluate(`(()=>{const el=document.querySelector('.album-main');if(!el)return 'MISSING';el.click();return 'OK';})()`);
      if(clickStep!=='OK')await wait(400);
     }
     if(clickStep!=='OK')throw Error('Không bấm được album chính');
     await until(`document.querySelector('dialog[open]')`);
     await wait(300);
     await screenshot(`${prefix}-lightbox-${theme.toLowerCase()}-1440`);
     await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
     await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
     await until(`!document.querySelector('dialog[open]')`);
    }
   }
  }
 }
 console.log('PASS: ảnh '+prefix+' ('+(guestMode?'guest countdown+music':'3 theme + album + lightbox')+') không tràn ngang');
}finally{socket?.close();browser.kill();}
