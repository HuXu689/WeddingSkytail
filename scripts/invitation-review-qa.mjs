// Isolated frontend regression audit. All /api/v1 requests use fixtures, never real guest data.
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const origin=process.env.INVITATION_QA_ORIGIN??'http://127.0.0.1:3000';
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
 }
 // Screenshot regression: short copy must not collapse into a tall title column.
 await command('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.fixture.displayName='Anh Quân';
  Object.assign(window.fixture.wedding,{theme:'TRADITIONAL',accent:'BURGUNDY',names:'An & Bình',message:'Trân trọng mời bạn chung vui trong ngày hạnh phúc.',story:'Câu chuyện của chúng mình bắt đầu từ một buổi chiều đầy nắng.',footer:'Cảm ơn bạn đã đến chung vui',heroUrl:${JSON.stringify(picture)},albumUrls:Array(7).fill(${JSON.stringify(picture)})});
  window.fixture.events=[{...window.fixture.events[0],title:'Tiệc mừng cùng bạn bè',venue:'The Bloom Wedding House',address:'88 Trần Phú, Hải Châu, Đà Nẵng',event_note:null,dress_code:null,parking:null,revision:0,status:'ATTENDING',total_people:1,note:'Rất vui được góp mặt trong ngày vui.'}];window.fixture.wishes=[];
 `});
 await command('Page.navigate',{url:`${origin}/invitation/desktop-layout`});await until(`document.querySelector('.rsvp-form')`);
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
 console.log(`PASS: 21 theme/viewport cases; long content, draft preservation, RSVP conflict/save/double-submit, event tools, 4 modal sizes, focus/keyboard, sealed/PIN gates, albums 1–5; 6 short-copy desktop/mobile layouts, control padding, story/title geometry, 125–200% zoom-equivalent viewports, textarea resize, reduced motion. Artifacts: ${directory}`);
}finally{socket?.close();browser.kill();}