// Isolated frontend regression audit. All /api/v1 requests use fixtures, never real guest data.
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {decodePng,worstPixelContrast,CONTROL_PNG_BLACK_WHITE,CONTROL_PNG_GRAY} from './contrast-pixels.mjs';
// Next.js 16 dev chặn origin 127.0.0.1 (allowedDevOrigins); dùng localhost cho mặc định.
const origin=process.env.INVITATION_QA_ORIGIN??'http://localhost:3000';
const directory=resolve('.qa-artifacts/invitation-review');mkdirSync(directory,{recursive:true});
const browser=spawn(process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run',`--user-data-dir=${directory}/chrome`,'--remote-debugging-port=9241','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket;
try{
 let targets;
 for(let i=0;i<80;i++){try{targets=await(await fetch('http://127.0.0.1:9241/json')).json();break;}catch{await wait(250);}}
 assert.ok(targets,'Chrome DevTools did not start');
 socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let serial=0;const pending=new Map(),errors=[];
 socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);if(message.id){const task=pending.get(message.id);pending.delete(message.id);message.error?task.reject(message.error):task.resolve(message.result);}};
 const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;const timeout=setTimeout(()=>{pending.delete(id);reject(Error(`CDP timeout: ${method}`));},30000);pending.set(id,{resolve:value=>{clearTimeout(timeout);resolve(value);},reject:error=>{clearTimeout(timeout);reject(error);}});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const response=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(response.exceptionDetails)throw Error(JSON.stringify(response.exceptionDetails));return response.result.value;};
 const until=async expression=>{for(let i=0;i<200;i++){if(await evaluate(`Boolean(${expression})`))return;await wait(100);}throw Error(`Timeout: ${expression}`);};
 const screenshot=async name=>{const result=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${directory}/${name}.png`,Buffer.from(result.data,'base64'));};
 const metrics=async(width,height=844)=>command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
 const picture='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#b3bca8"/><circle cx="450" cy="400" r="160" fill="#52664c"/></svg>');
 const long='Địa chỉ và lời mời rất dài '.repeat(4)+'X'.repeat(160);
 const party={id:'party',title:long,start_at:'2027-12-20T10:00:00Z',timezone:'Asia/Ho_Chi_Minh',venue:long,address:long,state:'PUBLISHED',max_people:5,status:null,total_people:null,note:null,event_note:long,response_version:0,rsvp_open:true,maps_url:'https://maps.google.com',dress_code:long,parking:long,change_notice:long,revision:1};
 const fixture={displayName:long,salutation:'Trân trọng kính mời',wedding:{names:'Nguyễn Hoàng Minh Anh & Trần Nguyễn Quốc Bảo',message:long,theme:'ELEGANT',accent:'OLIVE',story:long,footer:long,show_story:true,heroUrl:picture,albumUrls:Array(5).fill(picture),show_countdown:true},events:[party,{...party,id:'cancelled',state:'CANCELLED',status:'ATTENDING',rsvp_open:false}],wishes:[{display_name:long,message:long,created_at:'2026-10-20T00:00:00Z'}]};
 party.deadline='2027-12-19T10:00:00Z';fixture.events[1].deadline=party.deadline;
 // Nội dung 5 phần (content schema 2). Thiệp khách hợp lệ nhận cả mục riêng tư vì máy chủ đã cấp quyền.
const contrastSource=readFileSync(resolve('scripts/contrast-audit.mjs'),'utf8').replace(/export\s+/g,'');
/**
 * T20: đo contrast bằng pixel thật cho các mẫu mà computed style không kết luận được (nền ảnh,
 * alpha, opacity). Chữ được ẩn tạm trong lúc chụp nên vùng đo chỉ còn nền đã composite; contrast
 * lấy theo pixel XẤU NHẤT. `CONTRAST_QA_DUMP=1` lưu từng vùng đã đo vào `.qa-artifacts/.../probes`.
 */
const measurePixels=async pending=>{
 const samples=[],skipped=[];
 if(!pending.length)return {samples,skipped};
 await evaluate(`(()=>{if(document.getElementById('contrast-probe-style'))return true;const style=document.createElement('style');style.id='contrast-probe-style';style.textContent='[data-contrast-probe],[data-contrast-probe] *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;text-decoration-color:transparent!important}';document.head.append(style);return true;})()`);
 for(const item of pending){
  try{
   await evaluate(`(()=>{const el=window.__contrastPending[${item.index}];if(!el)return false;el.scrollIntoView({block:'center',inline:'center'});return true;})()`);
   let opacity=item.opacity,previous=-2;
   for(let attempt=0;attempt<12;attempt++){
    opacity=await evaluate(`(()=>{const el=window.__contrastPending[${item.index}];return el?window.__contrastHelpers.effectiveOpacity(el):-1;})()`);
    if(opacity===previous)break;
    previous=opacity;await wait(140);
   }
   if(opacity<=0){skipped.push({text:item.text,reason:'hidden'});continue;}
   const box=await evaluate(`(()=>{const el=window.__contrastPending[${item.index}];return el?window.__contrastHelpers.textBox(el):null;})()`);
   if(!box||box.width<2||box.height<2){skipped.push({text:item.text,reason:'no-box'});continue;}
   if(box.width*box.height>400000){skipped.push({text:item.text,reason:'too-large'});continue;}
   await evaluate(`window.__contrastPending[${item.index}].setAttribute('data-contrast-probe','')`);
   await wait(60);
   const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:box.x,y:box.y,width:box.width,height:box.height,scale:1}});
   await evaluate(`window.__contrastPending[${item.index}].removeAttribute('data-contrast-probe')`);
   const image=Buffer.from(shot.data,'base64');
   if(process.env.CONTRAST_QA_DUMP){const folder=resolve(directory,'probes');mkdirSync(folder,{recursive:true});writeFileSync(`${folder}/${String(item.index).padStart(2,'0')}-${(item.className||item.tag).replace(/[^a-z0-9-]+/gi,'-')}.png`,image);}
   const measured=worstPixelContrast(decodePng(image),item.foreground,opacity);
   samples.push({text:item.text,tag:item.tag,className:item.className,color:item.color,background:'pixels',pixels:measured.pixels,opacity,size:item.size,ratio:measured.ratio,required:item.required,pass:measured.ratio>=item.required});
  }catch(error){skipped.push({text:item.text,reason:String(error.message).slice(0,120)});}
 }
 return {samples,skipped};
};
const longNote='Mô tả dài để kiểm tra ngắt dòng và tràn khung '.repeat(4)+'X'.repeat(64);
const sectionsLong=[
 {kind:'INTRO',audience:'PUBLIC',enabled:true,title:'Giới thiệu hai bạn',body:'Lời dẫn đủ dài để kiểm tra nhịp chữ và ngắt dòng trên màn hẹp của phần giới thiệu.',startsAt:null,color:null,payload:{people:[{name:'Nguyễn Hoàng Minh Anh',role:'Cô dâu',note:longNote},{name:'Trần Nguyễn Quốc Bảo',role:'Chú rể',note:'Một đoạn ngắn.'}]}},
 {kind:'FAMILY',audience:'PUBLIC',enabled:true,title:'Gia đình',body:'',startsAt:null,color:null,payload:{groups:[{label:'Nhà gái',members:[{name:'Bà Nguyễn Thị Hoa',note:'Mẹ'},{name:'Ông Trần Văn Hùng',note:'Bố'}]},{label:'Nhà trai',members:[{name:'Bà Lê Thị Mai',note:'Mẹ'},{name:'Ông Nguyễn Văn An',note:'Bố'},{name:'Chị Nguyễn Thu Hà',note:'Chị gái'}]}]}},
 {kind:'CEREMONY',audience:'PRIVATE',enabled:true,title:'Nghi lễ riêng',body:'',startsAt:null,color:null,payload:{items:[{title:'Lễ gia tiên',lead:'Kính mời gia đình hai bên',time:'2027-12-20T01:23:00Z',venue:long,address:long,directions:'Đi theo hướng dẫn của gia đình.'},{title:'Tiệc thân mật',lead:'',time:null,venue:'Tư gia',address:'',directions:''}]}},
 {kind:'TIMELINE',audience:'PUBLIC',enabled:true,title:'Mốc lịch trình',body:'',startsAt:null,color:null,payload:{timeline:[{at:'2027-12-20T09:00:00Z',title:'Đón khách',note:'Có xe đưa đón.',venue:'Sảnh chính',audience:'PUBLIC',tentative:false},{at:'2027-12-20T01:23:00Z',title:'Lễ gia tiên',note:'',venue:'Tư gia nhà gái',audience:'PRIVATE',tentative:true},{at:'2027-12-21T04:00:00Z',title:'Tiệc mừng',note:'Kết thúc dự kiến 21:00.',venue:'Nhà hàng The Bloom',audience:'PUBLIC',tentative:false}]}},
 {kind:'DRESS_CODE',audience:'PUBLIC',enabled:true,title:'Trang phục',body:'Tông sáng và thoải mái để bạn nhảy cùng chúng mình cả buổi.',startsAt:null,color:null,payload:{palette:[{name:'Trắng ngà',color:'#fffdf9'},{name:'Xanh rêu',color:'#52664c'},{name:'Đỏ trầm',color:'#823b42'}],avoid:'Hạn chế màu quá tối và họa tiết rối.'}}
];
const sectionsShort=[
 {kind:'INTRO',audience:'PUBLIC',enabled:true,title:'Giới thiệu hai bạn',body:'Chúng mình quen nhau ở Đà Nẵng.',startsAt:null,color:null,payload:{people:[{name:'An',role:'Cô dâu',note:'Thích hoa dại.'},{name:'Bình',role:'Chú rể',note:'Mê cà phê.'}]}},
 {kind:'FAMILY',audience:'PUBLIC',enabled:true,title:'Gia đình',body:'',startsAt:null,color:null,payload:{groups:[{label:'Nhà gái',members:[{name:'Bà Hoa',note:'Mẹ'}]},{label:'Nhà trai',members:[{name:'Ông An',note:'Bố'},{name:'Chị Hà',note:'Chị gái'}]}]}},
 {kind:'CEREMONY',audience:'PRIVATE',enabled:true,title:'Nghi lễ riêng',body:'',startsAt:null,color:null,payload:{items:[{title:'Lễ gia tiên',lead:'Kính mời gia đình.',time:'2027-12-20T01:23:00Z',venue:'Tư gia',address:'12 Lê Lợi',directions:''}]}},
 {kind:'TIMELINE',audience:'PUBLIC',enabled:true,title:'Mốc lịch trình',body:'',startsAt:null,color:null,payload:{timeline:[{at:'2027-12-20T09:00:00Z',title:'Đón khách',note:'',venue:'Sảnh',audience:'PUBLIC',tentative:false},{at:'2027-12-20T01:23:00Z',title:'Lễ gia tiên',note:'',venue:'Tư gia',audience:'PRIVATE',tentative:true}]}},
 {kind:'DRESS_CODE',audience:'PUBLIC',enabled:true,title:'Trang phục',body:'Tông sáng.',startsAt:null,color:null,payload:{palette:[{name:'Trắng ngà',color:'#fffdf9'},{name:'Đỏ trầm',color:'#823b42'}],avoid:'Tránh màu quá tối.'}}
];
fixture.wedding.sections=sectionsLong;
 await command('Page.enable');await command('Runtime.enable');
 await command('Page.addScriptToEvaluateOnNewDocument',{source:`
 window.fixture=${JSON.stringify(fixture)};window.saved=0;
 const nativeFetch=window.fetch;window.fetch=async(input,init)=>{
  const url=String(input);if(!url.startsWith('/api/v1/'))return nativeFetch(input,init);
  let result=window.fixture,status=200;
  if(url.endsWith('/csrf'))result={headerName:'X-CSRF',token:'test'};
  else if(url.endsWith('/state')){result={opened:!location.pathname.endsWith('/sealed')};if(location.pathname.endsWith('/pin')&&!window.pinAccepted){status=428;result={detail:'PIN required'};}}
  else if(url.endsWith('/pin')&&init?.method==='POST'){window.pinAccepted=JSON.parse(init.body).pin==='582649';result={};if(!window.pinAccepted){status=403;result={detail:'Wrong PIN'};}}
  else if(url.endsWith('/open'))result={};
  else if(url.endsWith('/wishes'))result=[];
  else if(url.endsWith('/rsvp')){
   window.saved++;await new Promise(resolve=>setTimeout(resolve,150));const body=JSON.parse(init.body);
   if(window.conflict){Object.assign(window.fixture.events[0],{status:'DECLINED',total_people:0,note:'Phản hồi từ thiết bị khác',response_version:2});status=409;result={detail:'Conflict'};window.conflict=false;}
   else{Object.assign(window.fixture.events[0],{status:body.status,total_people:body.totalPeople,note:body.note,response_version:window.fixture.events[0].response_version+1});result={};}
  }
  return new Response(JSON.stringify(result),{status,headers:{'Content-Type':'application/json'}});
 };`});
 const report=[];
 for(const theme of ['ELEGANT','TRADITIONAL','MODERN']){
  await command('Page.addScriptToEvaluateOnNewDocument',{source:`window.fixture.wedding.theme=${JSON.stringify(theme)};`});
  await command('Page.navigate',{url:`${origin}/invitation/review`});await until(`document.querySelector('.wedding-canvas')`);
  for(const width of [320,360,390,520,768,1024,1440]){
   await metrics(width);await wait(100);
   const result=await evaluate(`(()=>{const root=document.querySelector('.wedding-canvas');return {theme:${JSON.stringify(theme)},width:innerWidth,documentWidth:document.documentElement.scrollWidth,clipped:[...root.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().width>0&&e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflowX==='visible'&&!['IMG','INPUT','TEXTAREA','SELECT'].includes(e.tagName)).map(e=>({tag:e.tagName,class:e.className,width:e.clientWidth,scroll:e.scrollWidth})),inputSizes:[...document.querySelectorAll('.rsvp-form input,.rsvp-form select,.rsvp-form textarea,.wish-form input,.wish-form textarea')].map(e=>parseFloat(getComputedStyle(e).fontSize))};})()`);
   if(result.clipped.length)console.log(await evaluate(`(()=>{const root=document.querySelector('.wedding-cover'),r=root.getBoundingClientRect();return [...root.querySelectorAll('*')].map(e=>({tag:e.tagName,class:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,parentRight:r.right,width:getComputedStyle(e).width,min:getComputedStyle(e).minWidth})).filter(e=>e.right>r.right+2);})()`));
   report.push(result);assert.equal(result.documentWidth,width,`${theme} ${width}: document overflow`);assert.deepEqual(result.clipped,[],`${theme} ${width}: clipped content`);assert.ok(result.inputSizes.every(size=>size>=16));
  }
 }
 assert.equal(await evaluate(`document.querySelector('.rsvp-summary strong').textContent`),'Đã phản hồi 0/1 buổi tiệc');
 // F04: use actual keyboard input against the native disclosure, not scripted click toggling.
 const disclosureKey=async(key,code,value)=>{await command('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:value,...(key==='Enter'?{text:'\r',unmodifiedText:'\r'}:key===' '?{text:' ',unmodifiedText:' '}:{})});await command('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:value});};
 assert.equal(await evaluate(`document.querySelector('.guest-disclosure').open`),false);
 assert.equal(await evaluate(`document.querySelector('.wish-form textarea').checkVisibility()`),false);
 assert.ok(await evaluate(`document.querySelector('.wish-list').getBoundingClientRect().height>0`));
 for(const width of [320,768,1440]){
  await metrics(width);await evaluate(`document.querySelector('.guest-disclosure>summary').focus();true`);
  await disclosureKey('Enter','Enter',13);await until(`document.querySelector('.guest-disclosure').open`);
  assert.equal(await evaluate(`document.activeElement.matches('.guest-disclosure>summary')`),true);
  await disclosureKey('Tab','Tab',9);
  assert.equal(await evaluate(`document.activeElement.matches('.wish-form input')`),true);
  await evaluate(`document.querySelector('.wish-form textarea').focus();document.querySelector('.wish-form textarea').select();true`);await command('Input.insertText',{text:'Bản nháp giữ nguyên'});
  await evaluate(`document.querySelector('.guest-disclosure>summary').focus();true`);await disclosureKey(' ','Space',32);await until(`!document.querySelector('.guest-disclosure').open`);
  await disclosureKey('Tab','Tab',9);assert.equal(await evaluate(`document.activeElement.closest('.guest-disclosure-body')!==null`),false);
  await evaluate(`document.querySelector('.guest-disclosure>summary').focus();true`);await disclosureKey('Enter','Enter',13);await until(`document.querySelector('.guest-disclosure').open`);
  assert.equal(await evaluate(`document.querySelector('.wish-form textarea').value`),'Bản nháp giữ nguyên');
  assert.equal(await evaluate('document.documentElement.scrollWidth'),width);
  await evaluate(`document.querySelector('.guest-disclosure').scrollIntoView({block:'center'});true`);await screenshot(`disclosure-${width}`);
  await evaluate(`document.querySelector('.guest-disclosure').open=false;true`);
 }
 await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.guest-disclosure-mark')).transitionDuration`),'0s');
 report.push({disclosure:{widths:[320,768,1440],enter:true,space:true,tabOrder:true,retainedDraft:true,reducedMotion:true}});
 await command('Emulation.setEmulatedMedia',{features:[]});
 await evaluate(`document.querySelector('.guest-disclosure').open=true;true`);
 // A draft survives an unrelated data refresh from the wish book.
 await evaluate(`document.querySelector('.rsvp-form textarea').focus();true`);
 await command('Input.insertText',{text:'Bản nháp đang viết'});
 await evaluate(`document.querySelector('.wish-form textarea').focus();true`);await command('Input.insertText',{text:'Chúc hai bạn hạnh phúc'});
 await evaluate(`document.querySelector('.wish-form').requestSubmit();true`);await until(`document.querySelector('.success')`);
 assert.equal(await evaluate(`document.querySelector('.rsvp-form textarea').value`),'Bản nháp đang viết');
 await evaluate(`window.conflict=true;document.querySelector('.rsvp-form').requestSubmit();document.querySelector('.rsvp-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));true`);
 await until(`document.querySelector('.rsvp-message')?.textContent.includes('ở nơi khác')`);
 assert.equal(await evaluate('window.saved'),1,'Concurrent submit was not blocked');
 assert.equal(await evaluate(`document.querySelector('.rsvp-form select').value`),'DECLINED');
 assert.equal(await evaluate(`document.querySelector('.rsvp-form textarea').value`),'Phản hồi từ thiết bị khác');
 await evaluate(`document.querySelector('.rsvp-form').requestSubmit();true`);await until(`document.querySelector('.rsvp-message')?.textContent.includes('Đã lưu phản hồi')`);
 assert.equal(await evaluate(`document.querySelector('.rsvp-summary strong').textContent`),'Đã phản hồi 1/1 buổi tiệc');
 await metrics(390);await evaluate(`document.querySelector('.event-tools').open=true;true`);await wait(100);
 assert.equal(await evaluate('document.documentElement.scrollWidth'),390);
 await screenshot('mobile-long-content');
 for(const [width,height] of [[320,640],[390,844],[844,390],[1440,900]]){
  await metrics(width,height);await evaluate(`document.querySelector('.album-main').click();true`);await until(`document.querySelector('dialog[open]')`);
  const box=await evaluate(`(()=>{const d=document.querySelector('dialog'),img=d.querySelector('img').getBoundingClientRect(),close=d.querySelector('.lightbox-close').getBoundingClientRect(),caption=d.querySelector('figcaption').getBoundingClientRect();return {width:innerWidth,height:innerHeight,imageTop:img.top,imageBottom:img.bottom,closeBottom:close.bottom,captionBottom:caption.bottom,scroll:d.scrollHeight,client:d.clientHeight};})()`);
  report.push({modal:box});assert.ok(box.imageTop>=box.closeBottom);assert.ok(box.captionBottom<=height);assert.ok(box.scroll<=box.client+1);
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});
  assert.match(await evaluate(`document.querySelector('dialog figcaption').textContent`),/Ảnh 2/);
  for(let i=0;i<5;i++){await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});assert.equal(await evaluate(`document.activeElement.closest('dialog')!==null`),true);}
  await screenshot(`album-${width}x${height}`);
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until(`!document.querySelector('dialog')`);
  assert.equal(await evaluate(`document.activeElement.classList.contains('album-main')`),true);
 }
 for(const page of ['sealed','pin']){
  await command('Page.navigate',{url:`${origin}/invitation/${page}`});await until(page==='pin'?`document.querySelector('.pin-form')`:`[...document.querySelectorAll('.invitation-entry button')].some(e=>!e.disabled&&e.textContent.includes('Mở thiệp'))`);
  assert.equal(await evaluate(`Boolean(document.querySelector('.wedding-canvas'))`),false,'Private payload visible before consent/PIN');
  for(const width of [320,390,768]){await metrics(width,640);assert.equal(await evaluate('document.documentElement.scrollWidth'),width);}
  if(page==='pin'){
   await evaluate(`document.querySelector('.pin-form input').focus();true`);await command('Input.insertText',{text:'111111'});await evaluate(`document.querySelector('.pin-form').requestSubmit();true`);await until(`document.querySelector('[role=alert]')`);
   await evaluate(`document.querySelector('.pin-form input').select();true`);await command('Input.insertText',{text:'582649'});await evaluate(`document.querySelector('.pin-form').requestSubmit();true`);
  }else await evaluate(`[...document.querySelectorAll('.invitation-entry button')].find(e=>e.textContent.includes('Mở thiệp')).click();true`);
  await until(`document.querySelector('.wedding-canvas')`);
 }
 for(const count of [1,2,3,4,5]){
  await command('Page.addScriptToEvaluateOnNewDocument',{source:`window.fixture.wedding.heroUrl=null;window.fixture.wedding.albumUrls=Array(${count}).fill(${JSON.stringify(picture)});`});
  await command('Page.navigate',{url:`${origin}/invitation/album-${count}`});await until(`document.querySelector('.wedding-canvas')`);
  await metrics(320);
  const actual=await evaluate(`document.querySelectorAll('.album-gallery button').length`);
  assert.equal(actual,count);
  assert.equal(await evaluate('document.documentElement.scrollWidth'),320);
  await evaluate(`document.querySelector('.album-main').click();true`);await until(`document.querySelector('dialog[open]')`);
  await evaluate(`document.querySelector('.lightbox-close').click();true`);
 if(count===5){
  // T20: cover KHÔNG ảnh dùng chữ accent trên nền sáng; scrim chỉ dành cho cover có ảnh nên ở
  // đây mọi mẫu chữ phải đo được bằng computed style (hoặc pixel) và đạt ngưỡng.
  const noPhoto=await evaluate(`(()=>{${contrastSource}
   return inspectContrast(document.querySelector('.wedding-inner'));})()`);
  const noPhotoPixels=await measurePixels(noPhoto.pending);
  const noPhotoFailures=[...noPhoto.failures,...noPhotoPixels.samples.filter(sample=>!sample.pass)];
  report.push({contrastNoPhoto:{measured:noPhoto.samples.length,pixelSamples:noPhotoPixels.samples.length,skipped:noPhoto.skipped.length+noPhotoPixels.skipped.length,failures:noPhotoFailures}});
  assert.deepEqual(noPhotoFailures,[],'Cover không có ảnh phải đạt contrast (chữ accent trên nền sáng)');
 }
 }
 // Screenshot regression: short copy must not collapse into a tall title column.
 await command('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.fixture.displayName='Anh Quân';
  Object.assign(window.fixture.wedding,{theme:'TRADITIONAL',accent:'BURGUNDY',names:'An & Bình',message:'Trân trọng mời bạn chung vui trong ngày hạnh phúc.',story:'Câu chuyện của chúng mình bắt đầu từ một buổi chiều đầy nắng.',footer:'Cảm ơn bạn đã đến chung vui',heroUrl:${JSON.stringify(picture)},albumUrls:Array(7).fill(${JSON.stringify(picture)}),sections:${JSON.stringify(sectionsShort)}});
  window.fixture.events=[{...window.fixture.events[0],title:'Tiệc mừng cùng bạn bè',venue:'The Bloom Wedding House',address:'88 Trần Phú, Hải Châu, Đà Nẵng',event_note:null,dress_code:null,parking:null,revision:0,status:'ATTENDING',total_people:1,note:'Rất vui được góp mặt trong ngày vui.'}];window.fixture.wishes=[];
 `});
 await command('Page.navigate',{url:`${origin}/invitation/desktop-layout`});await until(`document.querySelector('.rsvp-form')`);
 // T11: kiểm chứng 5 phần nội dung trong browser thật (fixture, không dùng dữ liệu khách thật).
 const sectionReport=await evaluate(`(()=>{
  const pick=selector=>[...document.querySelectorAll(selector)];
  const classOf={INTRO:'content-intro',FAMILY:'content-family',CEREMONY:'content-ceremony',TIMELINE:'content-timeline',DRESS_CODE:'content-dress-code'};
  const timeline=pick('.content-timeline .timeline-item');
  return {
   order:Object.keys(classOf).filter(kind=>document.querySelector('.'+classOf[kind])),
   headings:pick('.content-section .invitation-section-heading h2').map(e=>e.textContent),
   introPeople:pick('.content-intro .intro-person').length,
   introRoles:pick('.content-intro .intro-person-role').map(e=>e.textContent),
   familyGroups:pick('.content-family .family-group').length,
   familyMembers:pick('.content-family .family-member-name').length,
   ceremonyCards:pick('.content-ceremony .ceremony-card').length,
   ceremonyMetaLabels:pick('.content-ceremony .ceremony-meta dt').map(e=>e.textContent),
   timelineTimes:timeline.map(e=>e.querySelector('time').getAttribute('datetime')),
   timelineDays:pick('.content-timeline .timeline-day').map(e=>e.textContent),
   timelineTentative:pick('.content-timeline .timeline-tentative').length,
   palette:pick('.content-dress-code .dress-palette li').map(e=>e.querySelector('.dress-color-name').textContent+'|'+e.querySelector('.dress-color-hex').textContent),
   swatches:pick('.content-dress-code .dress-swatch').length,
   avoid:Boolean(document.querySelector('.content-dress-code .dress-avoid'))
  };
 })()`);
 report.push({sections:sectionReport});
 assert.deepEqual(sectionReport.order,['INTRO','FAMILY','CEREMONY','TIMELINE','DRESS_CODE'],'Thứ tự 5 phần không đúng');
 assert.deepEqual(sectionReport.headings,['Giới thiệu hai bạn','Gia đình','Nghi lễ riêng','Mốc lịch trình','Trang phục']);
 assert.equal(sectionReport.introPeople,2);assert.deepEqual(sectionReport.introRoles,['Cô dâu','Chú rể']);
 assert.equal(sectionReport.familyGroups,2);assert.equal(sectionReport.familyMembers,3);
 assert.equal(sectionReport.ceremonyCards,1);
 assert.ok(sectionReport.ceremonyMetaLabels.includes('Thời gian')&&sectionReport.ceremonyMetaLabels.includes('Địa điểm'));
 assert.deepEqual(sectionReport.timelineTimes,['2027-12-20T01:23:00Z','2027-12-20T09:00:00Z'],'Mốc phải sắp theo thời gian');
 assert.equal(sectionReport.timelineTentative,1,'Nhãn “Dự kiến” phải hiện cho mốc chưa chốt');
 assert.deepEqual(sectionReport.palette,['Trắng ngà|#FFFDF9','Đỏ trầm|#823B42'],'Tên màu phải đi kèm mã màu');
 assert.equal(sectionReport.swatches,2);assert.ok(sectionReport.avoid);
 // TYPO-002: tái hiện tên/lời dẫn nhiều dấu với dữ liệu NFD, không dùng dữ liệu khách thật.
 const vietnameseScript=await command('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{
  const intro=window.fixture.wedding.sections.find(s=>s.kind==='INTRO');
  intro.body='Giữa hàng triệu người trên thế gian, thật may mắn vì chúng mình đã tìm thấy nhau'.normalize('NFD');
  intro.payload.people[0].name='Trần Thanh Bình'.normalize('NFD');
  const family=window.fixture.wedding.sections.find(s=>s.kind==='FAMILY');
  family.body='Nơi khởi nguồn của yêu thương, tổ ấm nhỏ'.normalize('NFD');
  family.payload.groups[0].members[0].name='Ông Trần Quốc Tuấn'.normalize('NFD');
  return true;
 })()`});
 await command('Page.navigate',{url:`${origin}/invitation/vietnamese-typography`});await until(`document.querySelector('.intro-person-name')?.textContent==='Trần Thanh Bình'`);
 await command('DOM.enable');await command('CSS.enable');
 const {root:fontRoot}=await command('DOM.getDocument');
 const vietnameseFonts=[];
 for(const selector of ['.intro-person-name','.intro-lead','.family-member-name','.family-lead']){
  const {nodeId}=await command('DOM.querySelector',{nodeId:fontRoot.nodeId,selector});
  const {fonts}=await command('CSS.getPlatformFontsForNode',{nodeId});
  assert.ok(fonts.length,`${selector}: cần có font thực tế`);
  if(process.platform==='win32')assert.deepEqual(fonts.map(font=>font.familyName),['Times New Roman'],`${selector}: toàn bộ chữ Việt phải dùng cùng font, không ghép dấu từ font khác`);
  assert.ok(fonts.every(font=>!font.familyName.includes('Georgia')),`${selector}: không dùng Georgia thiếu glyph Việt`);
  const content=await evaluate(`document.querySelector(${JSON.stringify(selector)}).textContent`);
  assert.equal(content,content.normalize('NFC'),`${selector}: dữ liệu phải được NFC trước render`);
  vietnameseFonts.push({selector,fonts});
 }
 report.push({vietnameseFonts});
 await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1200,deviceScaleFactor:1,mobile:false});
 await evaluate(`document.querySelector('.content-intro').scrollIntoView();true`);await wait(200);await screenshot('vietnamese-desktop');
 await metrics(390,844);await wait(200);await screenshot('vietnamese-mobile');
 assert.equal(await evaluate('document.documentElement.scrollWidth'),390,'Nội dung tiếng Việt không tràn ngang');
 // Khôi phục fixture ngắn cho các assertion/contrast hiện có.
 await command('Page.removeScriptToEvaluateOnNewDocument',{identifier:vietnameseScript.identifier});
 await command('Page.navigate',{url:`${origin}/invitation/desktop-layout`});await until(`document.querySelector('.rsvp-form')`);
 // Mốc/mục riêng vẫn hiển thị cho khách hợp lệ: quyền do máy chủ quyết định, client không tự ẩn.
 assert.equal(await evaluate(`document.body.textContent.includes('Lễ gia tiên')`),true);
 // T20: đối chứng cho bộ đo pixel — nếu bộ giải mã hoặc phép chọn "nền xấu nhất" sai thì dừng ngay,
 // để một PASS ở dưới không phải là kết quả rỗng.
 const controlBlackWhite=decodePng(Buffer.from(CONTROL_PNG_BLACK_WHITE,'base64'));
 const controlGray=decodePng(Buffer.from(CONTROL_PNG_GRAY,'base64'));
 assert.deepEqual([...controlBlackWhite.pixels],[0,0,0,255,255,255,255,255],'Giải mã PNG đen/trắng sai');
 assert.equal(worstPixelContrast(controlBlackWhite,[255,255,255]).ratio,1,'Phải lấy pixel nền XẤU NHẤT (trắng trên trắng = 1:1)');
 assert.equal(worstPixelContrast(controlGray,[255,255,255]).ratio,4.54,'Xám #767676 trên trắng phải là 4.54:1');
 assert.ok(worstPixelContrast(controlGray,[255,255,255],.5).ratio<4.54,'Chữ bán trong suốt phải bị tính lại theo nền');
 const contrast=await evaluate(`(()=>{${contrastSource}
  return inspectContrast(document.querySelector('.wedding-inner'));})()`);
 const pixel=await measurePixels(contrast.pending);
 const contrastFailures=[...contrast.failures,...pixel.samples.filter(sample=>!sample.pass)];
 const contrastWorst=[...contrast.samples,...pixel.samples].map(sample=>sample.ratio).sort((left,right)=>left-right)[0]??null;
 report.push({contrast:{measured:contrast.samples.length,pixelSamples:pixel.samples.length,skipped:contrast.skipped.length+pixel.skipped.length,pixelSkipped:pixel.skipped,gradientSamples:contrast.samples.filter(sample=>sample.gradient).length,worst:contrastWorst,failures:contrastFailures}});
 assert.ok(contrast.samples.length>=10,`Cần đủ mẫu contrast cho 5 phần mới, chỉ đo được ${contrast.samples.length}`);
 assert.ok(contrast.samples.some(sample=>sample.gradient),'Cần ít nhất một mẫu đo trên nền gradient (thẻ nghi lễ)');
 assert.ok(contrast.samples.some(sample=>String(sample.className).includes('ceremony')),'Cần mẫu đo từ nội dung thẻ nghi lễ');
 assert.ok(pixel.samples.length>=5,`Cần đo được chữ trên nền ảnh/alpha bằng pixel thật, chỉ được ${pixel.samples.length}`);
 assert.ok(pixel.samples.some(sample=>String(sample.className).includes('cover')),'Cần mẫu chữ trên ảnh hero (nền ảnh + scrim)');
 assert.deepEqual(contrastFailures,[],'Có cặp màu không đạt ngưỡng contrast trong 5 phần mới');
 await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1200,deviceScaleFactor:1,mobile:false});await wait(150);
 await evaluate(`document.querySelectorAll('.content-section')[0].scrollIntoView({block:'start'});true`);await wait(150);await screenshot('sections-desktop');
 await metrics(390,844);await wait(150);await screenshot('sections-mobile');
 assert.equal(await evaluate('document.documentElement.scrollWidth'),390,'5 phần mới gây tràn ngang trên mobile');
 for(const [width,height] of [[320,844],[390,844],[768,1024],[1024,900],[1440,1000],[1920,1080]]){
  await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await wait(150);
  const geometry=await evaluate(`(()=>{
   const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
   const canvas=document.querySelector('.wedding-canvas'),story=document.querySelector('.wedding-story'),heading=story.querySelector('h2');
   const fields=[...document.querySelectorAll('.rsvp-form input,.rsvp-form select,.rsvp-form textarea,.wish-form input,.wish-form textarea')];
   const outside=fields.filter(e=>{const r=e.getBoundingClientRect(),form=e.closest('form'),p=form.getBoundingClientRect(),s=getComputedStyle(form);return r.left<p.left+parseFloat(s.paddingLeft)-1||r.right>p.right-parseFloat(s.paddingRight)+1;}).map(e=>e.tagName);
   const intros=[...document.querySelectorAll('.wedding-events>.section-intro,.wish-book .section-intro')].map(e=>({label:rect(e.querySelector('.eyebrow')),title:rect(e.querySelector('h2'))}));
   return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,canvas:rect(canvas),story:rect(story),storyHeading:rect(heading),outside,intros};
  })()`);
  report.push({shortCopy:geometry});assert.ok(geometry.documentWidth<=width);assert.deepEqual(geometry.outside,[],'Form control escaped inner padding');
  assert.ok(Math.abs(geometry.canvas.width-geometry.documentWidth)<=1,'Opened invitation must fill the available viewport');
  assert.ok(Math.abs(geometry.canvas.left)<=1,'Opened invitation must start at the viewport edge');
  for(const intro of geometry.intros)assert.ok(intro.title.top>=intro.label.bottom,'Section label must be above its title');
  if(width>=768){assert.ok(geometry.storyHeading.height<170,'Short heading collapsed into a narrow column');assert.ok(geometry.story.height<330,'Short story has excessive empty space');}
  await evaluate(`window.scrollTo(0,0);true`);await screenshot(`private-layout-${width}`);
  await evaluate(`document.querySelector('.rsvp-form textarea').focus();document.querySelector('.rsvp-form').scrollIntoView({block:'center'});true`);await screenshot(`private-form-${width}`);
 }
 // Desktop browser zoom reduces the CSS viewport; test 125%, 150% and 200% equivalents.
 for(const zoom of [1.25,1.5,2]){
  const width=Math.round(1920/zoom);
  await command('Emulation.setDeviceMetricsOverride',{width,height:Math.round(1080/zoom),deviceScaleFactor:zoom,mobile:false});
  assert.ok(await evaluate(`document.documentElement.scrollWidth<=${width}`));
  await evaluate(`(()=>{const field=document.querySelector('.rsvp-form textarea');field.style.height='300px';field.focus();return true;})()`);
  assert.equal(await evaluate(`(()=>{const e=document.querySelector('.rsvp-form textarea'),r=e.getBoundingClientRect(),p=e.closest('form').getBoundingClientRect();return r.left>=p.left+4&&r.right<=p.right-4&&r.bottom<=p.bottom;})()`),true);
 }
 await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.wedding-inner')).animationName`),'none');
 assert.deepEqual(errors,[],'Uncaught browser exceptions');
 writeFileSync(`${directory}/report.json`,JSON.stringify(report,null,2));
 console.log(`PASS: 21 theme/viewport cases; long content, draft preservation, RSVP conflict/save/double-submit, event tools, 4 modal sizes, focus/keyboard, sealed/PIN gates, albums 1–5; 6 short-copy desktop/mobile layouts, control padding, story/title geometry, 125–200% zoom-equivalent viewports, textarea resize, reduced motion; 5 phần nội dung (INTRO/FAMILY/CEREMONY/TIMELINE/DRESS_CODE) với thứ tự, sắp theo thời gian, nhãn màu, swatch và contrast đo trong browser. Artifacts: ${directory}`);
}finally{socket?.close();browser.kill();}