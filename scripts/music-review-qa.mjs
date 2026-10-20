import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
const origin=process.env.INVITATION_QA_ORIGIN??'http://127.0.0.1:3000';
const browser=spawn(process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run',`--user-data-dir=${resolve('.qa-artifacts/music-browser')}`,'--remote-debugging-port=9243','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket;
try{
 let targets;
 for(let i=0;i<80;i++){try{targets=await(await fetch('http://127.0.0.1:9243/json')).json();break;}catch{await wait(250);}}
 assert.ok(targets,'Chrome did not start');
 socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let serial=0;const pending=new Map();
 socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const task=pending.get(message.id);pending.delete(message.id);message.error?task.reject(message.error):task.resolve(message.result);}};
 const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const result=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.ok(!result.exceptionDetails,JSON.stringify(result.exceptionDetails));return result.result.value;};
 await command('Page.enable');await command('Runtime.enable');
 await command('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.playCalls=0;window.rejectPlay=location.search.includes('blocked');
  Object.defineProperty(HTMLMediaElement.prototype,'paused',{get(){return !this._playing;}});
  HTMLMediaElement.prototype.play=function(){window.playCalls++;if(window.rejectPlay)return Promise.reject(new DOMException('Blocked','NotAllowedError'));this._playing=true;this.dispatchEvent(new Event('play'));return Promise.resolve();};
  HTMLMediaElement.prototype.pause=function(){this._playing=false;this.dispatchEvent(new Event('pause'));};
  const design={names:'An & Hà',message:'Trân trọng kính mời',theme:'ELEGANT',accent:'OLIVE',story:'Câu chuyện '.repeat(1000),show_story:true,footer:'Cảm ơn',musicUrl:'/test.mp3',music_autoplay:!location.search.includes('manual'),albumUrls:[]};
  if(location.search.includes('hidden'))design.layout=['MUSIC','COUNTDOWN','STORY','CONTENT','ALBUM','THANKS'].map(section=>({section,enabled:section!=='MUSIC'}));
  const native=window.fetch;window.fetch=async(input,init)=>{const url=String(input);if(!url.startsWith('/api/v1/'))return native(input,init);let data=url.includes('/public/')?design:{displayName:'Khách mời',salutation:'Kính mời',wedding:design,events:[],wishes:[]};if(url.endsWith('/state'))data={opened:true};return new Response(JSON.stringify(data),{status:200});};
 `});
 for(const width of [390,1440]){
  await command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width===390});
  for(const route of ['/w/music-review','/invitation/music-review'])for(const mode of ['manual','auto','blocked','hidden']){
   await command('Page.navigate',{url:`${origin}${route}?${mode}`});
   let ready=false;for(let i=0;i<200;i++){if(await evaluate(`!!document.querySelector('.wedding-canvas')`)){ready=true;break;}await wait(100);}assert.ok(ready,'Canvas did not load');await wait(250);
   assert.equal(await evaluate(`document.querySelectorAll('.invitation-music').length`),mode==='hidden'?0:1);
   if(mode==='hidden'){assert.equal(await evaluate('window.playCalls'),0);continue;}
   assert.equal(await evaluate('window.playCalls'),mode==='manual'?0:1);
   assert.equal(await evaluate(`document.querySelector('.invitation-music-button').getAttribute('aria-pressed')`),mode==='auto'?'true':'false');
   const position=await evaluate(`(()=>{const r=document.querySelector('.invitation-music-button').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`);
   assert.equal(position.width,48);assert.equal(position.height,48);assert.ok(position.x>=0&&position.x+48<=width);
   await evaluate('window.scrollTo(0,1500)');await wait(100);
   assert.deepEqual(await evaluate(`(()=>{const r=document.querySelector('.invitation-music-button').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`),position);
   await evaluate(`window.rejectPlay=false;document.querySelector('.invitation-music-button').click()`);await wait(50);
   const expected=mode==='auto'?'false':'true';assert.equal(await evaluate(`document.querySelector('.invitation-music-button').getAttribute('aria-pressed')`),expected);
   if(expected==='true'){await evaluate(`document.querySelector('.invitation-music-button').click()`);await wait(50);assert.equal(await evaluate(`document.querySelector('.invitation-music-button').getAttribute('aria-pressed')`),'false');}
   // Reload with autoplay blocked, then unlock through a trusted browser interaction.
   if(mode==='blocked'){
    for(const gesture of ['click','touch','keyboard','icon']){
     await command('Page.reload');
     let loaded=false;for(let i=0;i<200;i++){if(await evaluate(`!!document.querySelector('.invitation-music-button')&&window.playCalls===1`)){loaded=true;break;}await wait(100);}assert.ok(loaded,'Reload did not restore autoplay');await wait(100);
     assert.equal(await evaluate(`document.querySelector('.invitation-music-button').getAttribute('aria-pressed')`),'false');
     await evaluate('window.rejectPlay=false');
     if(gesture==='keyboard'){
      await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
      await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
     }else if(gesture==='touch'){
      await command('Emulation.setTouchEmulationEnabled',{enabled:true});
      await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:30,y:200}]});
      await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await command('Emulation.setTouchEmulationEnabled',{enabled:false});
     }else{
      const point=gesture==='icon'?await evaluate(`(()=>{const r=document.querySelector('.invitation-music-button').getBoundingClientRect();return {x:r.x+24,y:r.y+24};})()`):{x:30,y:200};
      await command('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
      await command('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
     }
     await wait(100);
     assert.equal(await evaluate('window.playCalls'),2,`Exactly one gesture retry (${gesture})`);
     assert.equal(await evaluate(`document.querySelector('.invitation-music-button').getAttribute('aria-pressed')`),'true');
     await evaluate(`document.querySelector('.invitation-music-button').click()`);await wait(50);
     await command('Input.dispatchMouseEvent',{type:'mousePressed',x:30,y:200,button:'left',clickCount:1});
     await command('Input.dispatchMouseEvent',{type:'mouseReleased',x:30,y:200,button:'left',clickCount:1});await wait(50);
     assert.equal(await evaluate('window.playCalls'),2,'Manual pause must not trigger another autoplay');
     assert.equal(await evaluate(`document.querySelector('.invitation-music-button').getAttribute('aria-pressed')`),'false');
    }
   }
  }
 }
 console.log('PASS: 16 base cases plus 16 reload/gesture cases (private/public, mobile/desktop, click/touch/keyboard/icon), fixed position, blocked autoplay recovery and no restart after manual pause. Playback mocked; gestures dispatched by Chrome.');
}finally{socket?.close();browser.kill();}