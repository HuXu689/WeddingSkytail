// Probe chẩn đoán lỗi gift-dialog-review-qa.mjs dòng 71: mô phỏng metadata 503 rồi dump trạng thái dialog.
// Chạy: node scripts/rework-r09-probe.mjs (cần dev server localhost:3000)
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const origin='http://localhost:3000';
const directory=resolve('.qa-artifacts/rework/R09');mkdirSync(directory,{recursive:true});
const browser=spawn(process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run',`--user-data-dir=${directory}/chrome-probe`,'--remote-debugging-port=9246','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let socket;
try{
 let targets;
 for(let i=0;i<80;i++){try{targets=await(await fetch('http://127.0.0.1:9246/json')).json();break;}catch{await wait(250);}}
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((res,rej)=>{socket.onopen=res;socket.onerror=rej;});
 let serial=0;const pending=new Map();
 socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const t=pending.get(m.id);pending.delete(m.id);m.error?t.reject(m.error):t.resolve(m.result);}};
 const command=(method,params={})=>new Promise((res,rej)=>{const id=++serial;const timeout=setTimeout(()=>{pending.delete(id);rej(Error('CDP timeout: '+method));},30000);pending.set(id,{resolve:v=>{clearTimeout(timeout);res(v);},reject:e=>{clearTimeout(timeout);rej(e);}});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const until=async expression=>{for(let i=0;i<100;i++){if(await evaluate(`Boolean(${expression})`))return true;await wait(100);}return false;};
 await command('Page.enable');await command('Runtime.enable');
 await command('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.giftReads=0;window.giftFailure=false;
  const design={names:'Hai người minh họa',message:'Thiệp kiểm thử',theme:'ELEGANT',accent:'OLIVE',story:'',footer:'Cảm ơn',show_story:false,albumUrls:[]};
  const original=window.fetch;window.fetch=async(input,init)=>{
   const url=String(input);if(!url.startsWith('/api/v1/'))return original(input,init);
   if(url.includes('/assets/'))return new Response(new Uint8Array([137,80,78,71]),{status:200,headers:{'Content-Type':'image/png'}});
   let result={};
   if(url.endsWith('/state'))result={opened:true};
   else if(url.endsWith('/gifts')){window.giftReads++;if(window.giftFailure){window.giftFailure=false;return new Response('{}',{status:503});}result={enabled:true,mode:'DUAL',recipients:[{label:'Người nhận minh họa A',description:'Mô tả minh họa',assetId:'qa-first'},{label:'Người nhận minh họa B',description:'',assetId:'qa-second'}]};}
   else if(url.endsWith('/wishes')||url.includes('approved-wishes'))result={items:[],nextCursor:null};
   else if(url.includes('/public/weddings/'))result=design;
   else result={wedding:design,displayName:'Khách minh họa',salutation:'Kính mời',events:[]};
   return new Response(JSON.stringify(result),{status:200});
  };`});
 await command('Page.navigate',{url:origin+'/invitation/dual-fixture'});
 console.log('trigger:',await until(`document.querySelector('.gift-trigger')`));
 await evaluate(`document.querySelector('.gift-trigger').click();true`);
 console.log('first open:',await until(`document.querySelector('.gift-dialog[open] .gift-qr')?.complete`),'reads=',await evaluate('window.giftReads'));
 await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 console.log('closed:',await until(`!document.querySelector('.gift-dialog')`));
 await evaluate(`window.giftFailure=true;document.querySelector('.gift-trigger').click();true`);
 await wait(3000);
 const dump=await evaluate(`JSON.stringify({dialog:!!document.querySelector('.gift-dialog'),alert:!!document.querySelector('.gift-dialog [role=alert]'),text:(document.querySelector('.gift-dialog')?.textContent??'').slice(0,220),reads:window.giftReads,failure:window.giftFailure})`);
 console.log('dump:',dump);
}finally{
 try{socket?.close();}catch{}
 browser.kill();
}