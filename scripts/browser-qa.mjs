// Dependency-free Chrome DevTools QA on the isolated QA stack only.
import {spawn} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {deflateSync} from 'node:zlib';
import {inspectContrast} from './contrast-audit.mjs';
const origin='http://localhost:8099';
const directory=resolve('.qa-artifacts');mkdirSync(directory,{recursive:true});
const env=Object.fromEntries(readFileSync('.env','utf8').split(/\r?\n/).filter(line=>/^[^#=]+=/.test(line)).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
const chrome=process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser=spawn(chrome,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${resolve('.qa-browser')}`,'--remote-debugging-port=9237','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ready=false;
for(let i=0;i<60;i++){try{if((await fetch(`${origin}/api/v1/health`)).ok&&(await fetch(`${origin}/w/our-wedding`)).ok){ready=true;break;}}catch{}await wait(500);}
if(!ready){browser.kill();throw new Error('QA backend/frontend did not become ready');}
let socket;
try{
 let targets;
 for(let i=0;i<50;i++){try{targets=await (await fetch('http://127.0.0.1:9237/json')).json();break;}catch{await wait(200);}}
 if(!targets)throw new Error('Chrome DevTools did not start');
 socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let serial=0;const pending=new Map();
 socket.onmessage=event=>{const response=JSON.parse(event.data);if(response.method==='Page.javascriptDialogOpening'&&response.params.type==='beforeunload')void command('Page.handleJavaScriptDialog',{accept:true});if(response.id){const task=pending.get(response.id);if(!task)return;pending.delete(response.id);response.error?task.reject(new Error(JSON.stringify(response.error))):task.resolve(response.result);}};
 const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;const timeout=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method}`));},30000);pending.set(id,{resolve:value=>{clearTimeout(timeout);resolve(value);},reject:error=>{clearTimeout(timeout);reject(error);}});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const response=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(response.exceptionDetails)throw new Error(JSON.stringify(response.exceptionDetails));return response.result.value;};
 const until=async expression=>{for(let i=0;i<80;i++){if(await evaluate(`Boolean(${expression})`))return;await wait(100);}throw new Error(`Timeout: ${expression}`);};
 const screenshot=async name=>{await command('Page.bringToFront');await until('document.documentElement.clientWidth>0');const result=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(resolve(directory,`${name}.png`),Buffer.from(result.data,'base64'));};
 await command('Page.enable');await command('Runtime.enable');
 await command('Page.navigate',{url:`${origin}/w/our-wedding`});await until(`location.origin==='${origin}'&&document.readyState==='complete'`);
 const logged=await evaluate(`(async()=>{const csrf=await (await fetch('/api/v1/session/csrf')).json();const result=await fetch('/api/v1/auth/login',{method:'POST',headers:{[csrf.headerName]:csrf.token,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(${JSON.stringify({username:env.ADMIN_USERNAME,password:env.ADMIN_PASSWORD})})});return result.status;})()`);
 if(logged!==204)throw new Error('QA owner login failed');
 await evaluate(`window.qaApi=async(path,method='GET',body)=>{const headers={};if(method!=='GET'){const csrf=await (await fetch('/api/v1/session/csrf')).json();headers[csrf.headerName]=csrf.token;}if(body!==undefined)headers['Content-Type']='application/json';const result=await fetch('/api/v1'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});if(!result.ok)throw new Error(path+' '+result.status);const text=await result.text();return text?JSON.parse(text):null;};true`);
 await command('Page.addScriptToEvaluateOnNewDocument',{source:await evaluate(`'window.qaApi='+qaApi.toString()`)});
 // Generate a tiny deterministic bitmap test fixture, not product artwork.
 function crc32(buffer){let crc=0xffffffff;for(const byte of buffer){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
 function chunk(type,data){const name=Buffer.from(type),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([size,name,data,crc]);}
 function png(width,height){const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;const pixels=Buffer.alloc((width*3+1)*height);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const offset=y*(width*3+1)+1+x*3;pixels[offset]=80+Math.round(x/width*140);pixels[offset+1]=90+Math.round(y/height*110);pixels[offset+2]=100;}return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]).toString('base64');}
 const assets=[];
 for(const [width,height] of [[1200,800],[800,1200],[1000,1000],[1200,700],[700,1200]]){
  assets.push(await evaluate(`(async()=>{const csrf=await qaApi('/session/csrf');const form=new FormData();form.append('file',new Blob([Uint8Array.from(atob('${png(width,height)}'),c=>c.charCodeAt(0))],{type:'image/png'}),'qa-bitmap.png');const result=await fetch('/api/v1/admin/media',{method:'POST',headers:{[csrf.headerName]:csrf.token},body:form});if(!result.ok)throw new Error('Upload failed');return (await result.json()).id;})()`));
 }
 await evaluate(`(async()=>{await qaApi('/admin/media/hero/DRAFT','PUT',{id:'${assets[0]}'});await qaApi('/admin/media/album/DRAFT','PUT',{ids:${JSON.stringify(assets)}});return true;})()`);
 const report=[],contrast=[];
 for(const theme of ['ELEGANT','TRADITIONAL','MODERN']){
  await evaluate(`(async()=>{const w=await qaApi('/admin/wedding');await qaApi('/admin/wedding/design','PUT',{names:'Trần Thị Thu Hà & Nguyễn Hoàng Anh',message:'Dữ liệu giả kiểm tra tên dài và ảnh dọc/ngang.',theme:'${theme}',accent:'BURGUNDY',story:'Câu chuyện giả phục vụ QA.',footer:'Cảm ơn bạn.',showStory:true,showCountdown:false,expectedVersion:w.version});const current=await qaApi('/admin/wedding');await qaApi('/admin/wedding/publish','POST',{expectedVersion:current.version});return true;})()`);
  for(const width of [360,390,768,1440]){
   await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
   await command('Page.navigate',{url:`${origin}/w/our-wedding`});
   await until(`document.querySelector('.album-main img')?.complete`);await wait(850);
   await evaluate(`(async()=>{for(const image of document.querySelectorAll('.album-side img')){image.scrollIntoView();await image.decode().catch(()=>{});}scrollTo(0,0);return true;})()`);
   const metrics=await evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,coverWidth:document.querySelector('.wedding-cover').getBoundingClientRect().width,resources:performance.getEntriesByType('resource').map(r=>({name:r.name.split('/').pop(),bytes:r.transferSize,duration:r.duration})),navigation:performance.getEntriesByType('navigation')[0]?.duration})`);
   report.push({theme,width,...metrics});await screenshot(`${theme.toLowerCase()}-${width}`);
   if(width===390){await wait(850);contrast.push({theme,...await evaluate(`(${inspectContrast.toString()})()`) });}
   if(metrics.scrollWidth>metrics.width+1)throw new Error(`Horizontal overflow ${theme} ${width}`);
  }
 }
 // Every existing accent is a real persisted preset; do not invent or switch Owner's live theme.
 for(const theme of ['ELEGANT','TRADITIONAL','MODERN'])for(const accent of ['OLIVE','BURGUNDY','NAVY']){
  await evaluate(`(async()=>{const w=await qaApi('/admin/wedding');await qaApi('/admin/wedding/design','PUT',{names:w.draft_names,message:w.draft_message,theme:'${theme}',accent:'${accent}',story:w.draft_story,footer:w.draft_footer,showStory:w.draft_show_story,musicId:w.draft_music_id,showCountdown:w.draft_show_countdown,expectedVersion:w.version});const current=await qaApi('/admin/wedding');await qaApi('/admin/wedding/publish','POST',{expectedVersion:current.version});return true;})()`);
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await command('Page.navigate',{url:`${origin}/w/our-wedding`});await until(`document.querySelector('.album-main img')?.complete`);await wait(1600);
  const sample=await evaluate(`(${inspectContrast.toString()})()`);contrast.push({theme,accent,...sample});
  if(!await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`))throw new Error(`Accent overflow ${theme}/${accent}`);
  await screenshot(`preset-${theme.toLowerCase()}-${accent.toLowerCase()}-390`);
 }
 await evaluate(`document.querySelector('.album-main').focus();document.querySelector('.album-main').click();true`);await until(`document.querySelector('dialog[open]')`);
 const first=await evaluate(`document.activeElement.className`);if(!first.includes('lightbox-close'))throw new Error('Initial modal focus incorrect');
 for(let i=0;i<6;i++){await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});if(!await evaluate(`document.querySelector('dialog').contains(document.activeElement)`))throw new Error('Focus escaped modal');}
 for(let i=0;i<6;i++){await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',modifiers:8,windowsVirtualKeyCode:9});await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',modifiers:8,windowsVirtualKeyCode:9});if(!await evaluate(`document.querySelector('dialog').contains(document.activeElement)`))throw new Error('Reverse focus escaped modal');}
 await screenshot('lightbox-keyboard');await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await wait(200);
 if(!await evaluate(`document.activeElement.classList.contains('album-main')&&!document.querySelector('dialog[open]')`))throw new Error('Esc did not restore focus');
 await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 if(!await evaluate(`getComputedStyle(document.querySelector('.wedding-inner')).animationName==='none'`))throw new Error('Reduced motion not respected');
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 const failedMedia=await command('Page.addScriptToEvaluateOnNewDocument',{source:`window.qaOriginalFetch=window.fetch;window.fetch=function(input,...args){if(typeof input==='string'&&input==='/api/v1/admin/media')return Promise.reject(new TypeError('QA media offline'));return qaOriginalFetch.call(this,input,...args);};`});
 await command('Page.navigate',{url:`${origin}/admin/wedding`});await until(`document.querySelector('.design-controls')`);
 await until(`document.querySelector('.design-controls [role=alert]')?.textContent.includes('Không tải được danh sách nhạc')`);
 if(await evaluate(`Boolean(Array.from(document.querySelectorAll('.design-controls select')).find(select=>select.closest('label')?.textContent.startsWith('Nhạc nền')))`))throw new Error('Failed media load exposed an empty music selector');
 if(!await evaluate(`Boolean(Array.from(document.querySelectorAll('.design-controls label')).find(label=>label.textContent.includes('Hiển thị đếm ngược')&&label.querySelector('input[type=checkbox]:not(:disabled)')))`))throw new Error('Media error incorrectly blocked countdown');
 await command('Page.removeScriptToEvaluateOnNewDocument',{identifier:failedMedia.identifier});
 await evaluate(`window.fetch=qaOriginalFetch;Array.from(document.querySelectorAll('.design-controls button')).find(button=>button.textContent==='Thử tải lại danh sách nhạc').click();true`);
 await until(`!document.querySelector('.design-controls [role=alert]')&&Boolean(Array.from(document.querySelectorAll('.design-controls select')).find(select=>select.closest('label')?.textContent.startsWith('Nhạc nền')))`);
 await evaluate(`Array.from(document.querySelectorAll('.editor-mobile-tabs button')).find(button=>button.textContent==='Xem trước').click();true`);
 if(!await evaluate(`getComputedStyle(document.querySelector('.design-controls')).display==='none'&&getComputedStyle(document.querySelector('.design-preview')).display!=='none'`))throw new Error('Mobile editor panel failed');
 await screenshot('editor-mobile-preview');
 await evaluate(`window.qaRealOpen=window.open;window.open=function(...args){window.qaPopup=qaRealOpen.apply(window,args);return qaPopup;};Array.from(document.querySelectorAll('.preview-toolbar button')).find(button=>button.textContent==='Mở cửa sổ riêng').click();true`);
 await until(`window.qaPopup?.document.querySelector('.wedding-canvas')`);
 await evaluate(`qaPopup.close();true`);
 await until(`Array.from(document.querySelectorAll('.preview-toolbar button')).some(button=>button.textContent==='Mở cửa sổ riêng')`);
 await evaluate(`window.open=()=>null;Array.from(document.querySelectorAll('.preview-toolbar button')).find(button=>button.textContent==='Mở cửa sổ riêng').click();true`);
 await until(`document.querySelector('.design-preview [role=alert]')?.textContent.includes('chặn cửa sổ')`);
 await evaluate(`window.open=qaRealOpen;true`);
 // Native navigation traversal guard: dismiss preserves the draft; accepting Back leaves.
 await evaluate(`document.querySelector('a[href="/admin"]').click();true`);
 await until(`location.pathname==='/admin'`);
 await evaluate(`document.querySelector('a[href="/admin/wedding"]').click();true`);
 await until(`document.querySelector('.design-controls')`);
 await evaluate(`Array.from(document.querySelectorAll('.editor-mobile-tabs button')).find(button=>button.textContent==='Chỉnh sửa').click();true`);
 const originalName=await evaluate(`document.querySelector('.design-controls input:not([type])').value`);
 await evaluate(`document.querySelector('.design-controls input:not([type])').focus();document.querySelector('.design-controls input:not([type])').select();true`);
 await command('Input.insertText',{text:'Tên bản nháp chưa lưu QA'});
 await until(`document.querySelector('.design-warning')`);
 await evaluate(`window.qaConfirm=window.confirm;window.qaConfirmCount=0;window.confirm=()=>{qaConfirmCount++;return false;};setTimeout(()=>history.back(),0);true`);
 await wait(250);
 if(!await evaluate(`location.pathname==='/admin/wedding'&&qaConfirmCount===1&&document.querySelector('.design-controls input:not([type])').value==='Tên bản nháp chưa lưu QA'`))throw new Error('Back dismissal lost draft or missed confirmation');
 await evaluate(`window.confirm=()=>true;setTimeout(()=>history.back(),0);true`);
 await until(`location.pathname==='/admin'`);
 await command('Page.navigate',{url:`${origin}/admin/wedding`});await until(`document.querySelector('.design-controls input:not([type])')`);
 if(!await evaluate(`document.querySelector('.design-controls input:not([type])').value===${JSON.stringify(originalName)}`))throw new Error('Unsaved name was persisted unexpectedly');
 for(const count of [0,1,2,3,4,5]){
  await evaluate(`(async()=>{await qaApi('/admin/media/album/DRAFT','PUT',{ids:${JSON.stringify(assets)}.slice(0,${count})});const w=await qaApi('/admin/wedding');await qaApi('/admin/wedding/publish','POST',{expectedVersion:w.version});return true;})()`);
  await command('Page.navigate',{url:`${origin}/w/our-wedding`});await until(`document.querySelector('.wedding-canvas')`);await wait(250);
  const imageCount=await evaluate(`document.querySelectorAll('.album-gallery img').length`);
  if(imageCount!==count)throw new Error(`Album ${count}: rendered ${imageCount}`);
  if(!await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`))throw new Error(`Overflow in album ${count}`);
  if(count===1){await evaluate(`document.querySelector('.album-main').click();true`);await until(`document.querySelector('dialog[open]')`);await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});if(!await evaluate(`document.activeElement.classList.contains('lightbox-close')`))throw new Error('Single-image focus escaped');await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await wait(100);}
 }
 const invitation=await evaluate(`(async()=>{const events=await qaApi('/admin/events');const event=events.find(item=>item.state==='PUBLISHED');if(!event)throw new Error('Run smoke QA first');const invite=await qaApi('/admin/guests','POST',{displayName:'Khách kiểm thử trình duyệt',groupName:'QA',salutation:'Kính mời',assignments:[{eventId:event.id,maxPeople:2}]});const link=await qaApi('/admin/invitations/'+invite.id+'/link-reveal','POST');await qaApi('/guest-links/redeem','POST',{token:link.url.split('/').pop()});return invite.id;})()`);
 await command('Page.navigate',{url:`${origin}/invitation/${invitation}`});await until(`document.querySelector('.invitation-entry button:not(:disabled)')`);
 await screenshot('private-sealed-mobile');
 await evaluate(`Array.from(document.querySelectorAll('.invitation-entry button')).find(button=>button.textContent.trim().startsWith('Mở thiệp')).click();true`);
 await until(`document.querySelector('.rsvp-form')`);
 if(!await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`))throw new Error('Private invitation overflow');
 await screenshot('private-open-mobile');
 await evaluate(`document.querySelector('.rsvp-form').requestSubmit();true`);
 await until(`document.querySelector('.rsvp-message')?.textContent.includes('Đã lưu phản hồi')`);
 const saved=await evaluate(`qaApi('/guest/invitations/${invitation}').then(view=>view.events[0].status)`);
 if(saved!=='ATTENDING')throw new Error('Browser RSVP did not persist');
 await evaluate(`qaApi('/admin/invitations/${invitation}/pin','PUT',{pin:'582649'}).then(()=>true)`);
 await command('Page.navigate',{url:`${origin}/invitation/${invitation}`});await until(`document.querySelector('.pin-form input')`);
 if(await evaluate(`Boolean(document.querySelector('.wedding-canvas'))`))throw new Error('Private content leaked before PIN');
 const enterPin=async value=>{await evaluate(`document.querySelector('.pin-form input').focus();true`);await command('Input.insertText',{text:value});await evaluate(`document.querySelector('.pin-form').requestSubmit();true`);};
 await enterPin('111111');await until(`document.querySelector('[role=alert]')?.textContent.includes('Mã PIN không đúng')`);
 await evaluate(`document.querySelector('.pin-form input').select();true`);await enterPin('582649');await until(`document.querySelector('.rsvp-form')`);
 await evaluate(`qaApi('/admin/invitations/${invitation}/pin','DELETE').then(()=>true)`);
 // Reproducible lab profile, not a production performance certification.
 await command('Page.addScriptToEvaluateOnNewDocument',{source:`window.qaVitals={lcp:0,cls:0};new PerformanceObserver(list=>{for(const entry of list.getEntries())window.qaVitals.lcp=entry.startTime;}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.qaVitals.cls+=entry.value;}).observe({type:'layout-shift',buffered:true});`});
 await command('Network.enable');await command('Network.setCacheDisabled',{cacheDisabled:true});
 await command('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});
 await command('Emulation.setCPUThrottlingRate',{rate:4});
 await command('Page.navigate',{url:`${origin}/w/our-wedding`});await until(`document.querySelector('.cover-photo img')?.complete`);await wait(4500);
 const lab=await evaluate(`({...window.qaVitals,width:innerWidth,bytes:performance.getEntriesByType('resource').reduce((sum,item)=>sum+item.transferSize,0),fonts:Array.from(document.fonts).length})`);
 await screenshot('mobile-throttled-lab');
 writeFileSync(resolve(directory,'performance-lab.json'),JSON.stringify({profile:'390x844, CPU 4x, latency 150ms, download 1.6Mbps/upload 750Kbps, cache disabled, Chrome headless, local QA 5 bitmap fixtures, reduced motion enabled',measurement:lab,note:'Single lab run; not field Web Vitals, does not cover real wedding photography or older uploaded originals.'},null,2));
 await command('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await command('Emulation.setCPUThrottlingRate',{rate:1});
 writeFileSync(resolve(directory,'report.json'),JSON.stringify({configuration:'Chrome headless, local Docker QA, no throttling, 5 deterministic 700–1200px bitmap fixtures, system fonts',modalFocus:'Tab contained, Escape restored',reducedMotion:true,results:report},null,2));
 writeFileSync(resolve(directory,'contrast.json'),JSON.stringify({scope:'Computed-style samples with opaque solid backgrounds; image/gradient/opacity/transparency excluded. Not complete WCAG certification.',results:contrast},null,2));
 if(contrast.some(result=>result.failures.length))throw new Error('Computed solid-background contrast failures: see .qa-artifacts/contrast.json');
  console.log(`PASS: ${report.length} theme/viewport cases, modal keyboard, reduced motion, mobile editor, private open, RSVP submit, PIN wrong/correct; artifacts in ${directory}`);
}finally{socket?.close();browser.kill();}