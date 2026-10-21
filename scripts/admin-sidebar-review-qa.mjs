// Isolated admin sidebar scrolling QA: all API calls mocked; no real files or backend data touched.
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const origin=process.env.ADMIN_SIDEBAR_QA_ORIGIN??'http://localhost:3000';
const directory=resolve('.qa-artifacts/admin-sidebar-review');mkdirSync(directory,{recursive:true});
const browser=spawn(process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run',`--user-data-dir=${directory}/chrome`,'--remote-debugging-port=9247','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket;
try{
 let targets;
 for(let i=0;i<80;i++){try{targets=await(await fetch('http://127.0.0.1:9247/json')).json();break;}catch{await wait(250);}}
 assert.ok(targets,'Chrome DevTools did not start');
 socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let serial=0;const pending=new Map(),errors=[];
 socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);if(message.id){const task=pending.get(message.id);pending.delete(message.id);message.error?task.reject(message.error):task.resolve(message.result);}};
 const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;const timeout=setTimeout(()=>{pending.delete(id);reject(Error(`CDP timeout: ${method}`));},30000);pending.set(id,{resolve:value=>{clearTimeout(timeout);resolve(value);},reject:error=>{clearTimeout(timeout);reject(error);}});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const response=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(response.exceptionDetails)throw Error(JSON.stringify(response.exceptionDetails));return response.result.value;};
 const until=async expression=>{for(let i=0;i<200;i++){if(await evaluate(`Boolean(${expression})`))return;await wait(100);}throw Error(`Timeout: ${expression}`);};
 await command('Page.enable');await command('Runtime.enable');
 await command('Page.addScriptToEvaluateOnNewDocument',{source:`
  const original=window.fetch;window.fetch=async(input,init)=>{
   if(!String(input).startsWith('/api/v1/'))return original(input,init);
   const result=String(input).endsWith('/auth/me')?{username:'fixture',role:'OWNER'}:{counts:{pending:0,approved:0,rejected:0},rows:[],total:0};
   return new Response(JSON.stringify(result),{status:200});
  };`});
 await command('Page.navigate',{url:origin+'/admin/wishes'});await until(`document.querySelector('nav a[href="/admin/gifts"]')`);
 const report=[];
 for(const [width,height] of [[1440,900],[1366,600],[1024,400],[800,320]]){
  await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await evaluate(`window.scrollTo(0,0);document.querySelector('.sidebar').scrollTop=0;true`);
  const box=await evaluate(`(()=>{const s=document.querySelector('.sidebar'),b=s.getBoundingClientRect();return {height:b.height,scrollHeight:s.scrollHeight,clientHeight:s.clientHeight,x:b.x,y:b.y,width:b.width};})()`);
  assert.ok(Math.abs(box.height-height)<2);assert.ok(box.scrollHeight>box.clientHeight);
  await command('Input.dispatchMouseEvent',{type:'mouseMoved',x:box.x+box.width/2,y:Math.min(height-20,box.y+100)});
  await command('Input.dispatchMouseEvent',{type:'mouseWheel',x:box.x+box.width/2,y:Math.min(height-20,box.y+100),deltaX:0,deltaY:6000});
  await until(`document.querySelector('.sidebar').scrollTop>0`);
  await wait(250);
  assert.equal(await evaluate(`(()=>{const b=document.querySelector('.sidebar-foot a').getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight;})()`),true,'Footer link reachable by mouse wheel');
  assert.equal(await evaluate(`window.scrollY`),0,'Sidebar wheel must not move main page');
  await evaluate(`document.querySelector('.sidebar').scrollTop=0;document.querySelector('nav a[href="/admin/account"]').focus();true`);
  assert.equal(await evaluate(`(()=>{const b=document.activeElement.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight;})()`),true,'Last navigation item visible on keyboard focus');
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await evaluate(`document.activeElement.closest('.sidebar-foot')!==null`),true);
  const shot=await command('Page.captureScreenshot',{format:'png'});writeFileSync(directory+'/sidebar-'+width+'x'+height+'.png',Buffer.from(shot.data,'base64'));
  assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`));report.push({width,height,desktopWheelToFooter:true,lastItemFocus:true});
 }
 for(const width of [320,390,760]){
  await command('Emulation.setDeviceMetricsOverride',{width,height:650,deviceScaleFactor:1,mobile:true});
  await evaluate(`window.scrollTo(0,0);true`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.sidebar')).position`),'static');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.sidebar')).overflowY`),'visible');
  await evaluate(`document.querySelector('nav a[href="/admin/account"]').scrollIntoView({block:'center'});true`);
  assert.equal(await evaluate(`(()=>{const b=document.querySelector('nav a[href="/admin/account"]').getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight;})()`),true);
  assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`));report.push({width,mobilePageFlow:true,lastItemReachable:true});
 }
 assert.deepEqual(errors,[]);writeFileSync(directory+'/report.json',JSON.stringify(report,null,2));
 console.log('ADMIN_SIDEBAR_QA=PASS (wheel, footer, keyboard, desktop/short viewport/mobile; fixture only)');
}finally{socket?.close();browser.kill();}
