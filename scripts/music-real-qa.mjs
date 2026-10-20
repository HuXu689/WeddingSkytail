import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
const origin=process.env.INVITATION_QA_ORIGIN??'http://localhost:8088';
const browser=spawn(process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run',`--autoplay-policy=${process.env.MUSIC_QA_POLICY??'document-user-activation-required'}`,`--user-data-dir=${resolve(`.qa-artifacts/music-real-${Date.now()}`)}`,'--remote-debugging-port=9245','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket;
try{
 let targets;
 for(let i=0;i<80;i++){try{targets=await(await fetch('http://127.0.0.1:9245/json')).json();break;}catch{await wait(250);}}
 assert.ok(targets,'Chrome did not start');
 socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let serial=0;const pending=new Map();
 socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const task=pending.get(message.id);pending.delete(message.id);message.error?task.reject(message.error):task.resolve(message.result);}};
 const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const result=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.ok(!result.exceptionDetails,JSON.stringify(result.exceptionDetails));return result.result.value;};
 await command('Page.enable');await command('Runtime.enable');
 if(process.env.MUSIC_QA_PRIVATE==='1'){
  // Reuse the actual published API/audio without creating guests or recording real opens.
  // Only the private access envelope is a fixture; playback is never patched.
  await command('Page.addScriptToEvaluateOnNewDocument',{source:`
   const native=window.fetch;window.fetch=async(input,init)=>{
    const url=String(input);if(!url.includes('/api/v1/guest/invitations/music-audio-qa'))return native(input,init);
    const data=url.endsWith('/state')?{opened:true}:{displayName:'Khách kiểm tra âm thanh',salutation:'Kính mời',wedding:await (await native('/api/v1/public/weddings/our-wedding')).json(),events:[],wishes:[]};
    return new Response(JSON.stringify(data),{status:200});
   };`});
 }

 const url=process.env.MUSIC_QA_URL??`${origin}${process.env.MUSIC_QA_PRIVATE==='1'?'/invitation/music-audio-qa':'/w/our-wedding'}`;
 const state=()=>evaluate(`(()=>{const a=document.querySelector('.invitation-music audio');return {url:location.href,audio:!!a,src:a?.currentSrc,paused:a?.paused,time:a?.currentTime,ready:a?.readyState,error:a?.error?.code,status:document.querySelector('.invitation-music [role="status"]')?.textContent,pressed:document.querySelector('.invitation-music-button')?.getAttribute('aria-pressed')};})()`);
 async function loaded(){for(let i=0;i<150;i++){if((await state()).audio)return;await wait(100);}throw Error('No audio element');}
 for(const phase of ['open','reload']){
  if(phase==='open')await command('Page.navigate',{url});else await command('Page.reload');
  await loaded();await wait(1500);console.log(phase,await state());
  if((await state()).paused){
   assert.notEqual(process.env.MUSIC_QA_POLICY,'no-user-gesture-required','Allowed autoplay must not require interaction');
   const point=await evaluate(`(()=>{const p=document.querySelector('.invitation-music-prompt');if(!p)return {x:30,y:200,prompt:false};const r=p.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,prompt:true};})()`);
   if(process.env.MUSIC_QA_EXPECT_PROMPT==='1')assert.equal(point.prompt,true,'Blocked playback needs a visible actionable prompt');
   await command('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
   await command('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});
   await wait(1500);console.log(phase+' after gesture',await state());
  }
  const before=await state();await wait(600);const after=await state();
  assert.equal(after.paused,false,'Real audio must play after allowed autoplay or interaction');assert.ok(after.time>before.time,'Real decoded audio clock must advance');assert.equal(after.error,undefined);
  assert.equal(await evaluate(`!!document.querySelector('.invitation-music-prompt')`),false,'Prompt must disappear after playback');
 }
 console.log('PASS: actual API, actual audio decoding and advancing playback clock on open/reload.');
}finally{socket?.close();browser.kill();}
