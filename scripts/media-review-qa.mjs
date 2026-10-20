// Isolated media deletion QA: all API calls mocked; no real files or backend data touched.
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const origin=process.env.MEDIA_QA_ORIGIN??'http://localhost:3000';
const directory=resolve('.qa-artifacts/media-review');mkdirSync(directory,{recursive:true});
const browser=spawn(process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run',`--user-data-dir=${directory}/chrome`,'--remote-debugging-port=9243','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket;
try{
 let targets;
 for(let i=0;i<80;i++){try{targets=await(await fetch('http://127.0.0.1:9243/json')).json();break;}catch{await wait(250);}}
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
  window.mediaRows=['free','draft','live'].map(id=>({id,kind:'AUDIO',original_name:id+'.mp3',bytes:2048,draft_music:id==='draft',published_music:id==='live'}));
  window.deletes=[];window.rejectDelete=true;window.failReload=false;
  const nativeFetch=window.fetch;
  window.fetch=async(input,init)=>{
   const url=String(input);if(!url.startsWith('/api/v1/'))return nativeFetch(input,init);
   let result={},status=200;
   if(url.endsWith('/csrf'))result={headerName:'X-CSRF',token:'test'};
   else if(url.endsWith('/auth/me'))result={username:'owner',role:'OWNER'};
   else if(init?.method==='DELETE'){
    const id=url.split('/').pop();window.deletes.push(id);
    await new Promise(resolve=>setTimeout(resolve,200));
    if(window.rejectDelete){status=422;result={detail:'Tệp đang được dùng trong bản nháp hoặc bản đã phát hành.'};}
    else window.mediaRows=window.mediaRows.filter(row=>row.id!==id);
   }else if(url.endsWith('/admin/media')){
    if(window.failReload){status=503;result={detail:'Không thể tải lại thư viện.'};}else result=window.mediaRows;
   }else if(url.endsWith('/audio'))return new Response(null,{status:404});
   return new Response(JSON.stringify(result),{status,headers:{'Content-Type':'application/json'}});
  };
 `});
 await command('Page.navigate',{url:`${origin}/admin/media`});await until(`document.querySelectorAll('.music-item').length===3`);
 const initial=await evaluate(`([...document.querySelectorAll('.music-item')].map(row=>({name:row.querySelector('strong').textContent,disabled:row.querySelector('button').disabled,help:!!row.querySelector('a[href="/admin/wedding"]')})))`);
 assert.deepEqual(initial.map(row=>row.disabled),[false,true,true]);
 assert.ok(initial[1].help&&initial[2].help);
 assert.match(await evaluate(`document.querySelectorAll('.music-item')[2].textContent`),/phát hành/);
 await evaluate(`document.querySelector('.music-item button').click()`);await until(`document.querySelector('dialog[open]')`);
 await evaluate(`document.querySelector('dialog .secondary').click()`);await until(`!document.querySelector('dialog')`);
 assert.deepEqual(await evaluate('window.deletes'),[],'Cancel must not delete');
 await evaluate(`document.querySelector('.music-item button').click()`);await until(`document.querySelector('dialog[open]')`);
 await evaluate(`document.querySelector('dialog .danger').click()`);
 await until(`document.querySelector('dialog [role="alert"]')`);
 assert.match(await evaluate(`document.querySelector('dialog [role="alert"]').textContent`),/Tệp đang được dùng/);
 assert.equal(await evaluate(`document.querySelectorAll('.music-item').length`),3);
 assert.equal(await evaluate(`document.querySelector('dialog .danger').disabled`),false,'Retry must be enabled after failure');
 const shot=await command('Page.captureScreenshot',{format:'png'});writeFileSync(`${directory}/delete-error.png`,Buffer.from(shot.data,'base64'));
 await evaluate(`window.rejectDelete=false;document.querySelector('dialog .danger').click()`);
 await until(`!document.querySelector('dialog')&&document.querySelectorAll('.music-item').length===2`);
 assert.deepEqual(await evaluate('window.deletes'),['free','free']);
 // Successful DELETE + failed list refresh must still close the destructive dialog.
 await command('Page.navigate',{url:`${origin}/admin/media`});await until(`document.querySelectorAll('.music-item').length===3`);
 await evaluate(`window.rejectDelete=false;window.failReload=true;document.querySelector('.music-item button').click()`);await until(`document.querySelector('dialog[open]')`);
 await evaluate(`document.querySelector('dialog .danger').click()`);await until(`!document.querySelector('dialog')&&document.querySelector('[role="alert"]')`);
 assert.match(await evaluate(`document.querySelector('[role="alert"]').textContent`),/Không thể tải lại/);
 assert.deepEqual(errors,[]);
 writeFileSync(`${directory}/report.json`,JSON.stringify({initial,cancel:true,visibleError:true,retry:true,success:true,reloadFailureClosesDialog:true,errors},null,2));
 console.log('PASS: media deletion — in-use guidance, cancel, visible modal error, retry, success and reload failure; no real backend writes.');
}finally{socket?.close();browser.kill();}