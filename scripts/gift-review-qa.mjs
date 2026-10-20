// Isolated gift configuration QA: all API calls mocked; no real files or backend data touched.
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const origin=process.env.GIFT_QA_ORIGIN??'http://localhost:3000';
const directory=resolve('.qa-artifacts/gift-review');mkdirSync(directory,{recursive:true});
const browser=spawn(process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run',`--user-data-dir=${directory}/chrome`,'--remote-debugging-port=9244','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket;
try{
 let targets;
 for(let i=0;i<80;i++){try{targets=await(await fetch('http://127.0.0.1:9244/json')).json();break;}catch{await wait(250);}}
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
  const blank={enabled:false,mode:'SINGLE',visibility:'PRIVATE',first:{label:'',description:'',assetId:null},second:{label:'',description:'',assetId:null},revision:0};
  window.gifts={draft:structuredClone(blank),published:structuredClone(blank)};window.writes=[];window.uploads=0;window.uploadFailure=true;window.saveFailure=true;window.publishFailure=true;
  const original=window.fetch;window.fetch=async(input,init)=>{
   const url=String(input);if(!url.startsWith('/api/v1/'))return original(input,init);
   let result={},status=200;const method=init?.method||'GET';
   if(url.endsWith('/csrf'))result={headerName:'X-CSRF',token:'fixture'};
   else if(url.endsWith('/auth/me'))result={username:'fixture',role:location.search.includes('editor')?'EDITOR':'OWNER'};
   else if(url==='/api/v1/admin/gifts'&&location.search.includes('editor')){status=403;result={detail:'Chỉ chủ tiệc được xem cấu hình quà.'};}
   else if(url.endsWith('/assets')&&method==='POST'){
    window.uploads++;if(window.uploadFailure){window.uploadFailure=false;status=422;result={detail:'QA PNG rejected'};}else result={id:'asset-'+window.uploads};
   }else if(url.endsWith('/publish')){
    const body=JSON.parse(init.body);window.writes.push({kind:'publish',body});if(window.publishFailure){window.publishFailure=false;status=503;result={detail:'QA publish retry'};}else{window.gifts.published={...structuredClone(window.gifts.draft),revision:window.gifts.published.revision+1};result={revision:window.gifts.published.revision};}
   }else if(url==='/api/v1/admin/gifts'&&method==='PUT'){
    const body=JSON.parse(init.body);window.writes.push({kind:'save',body});
    if(window.conflict){window.conflict=false;status=409;result={detail:'QA configuration conflict'};}
    else if(window.saveFailure){window.saveFailure=false;status=503;result={detail:'QA save retry'};}
    else{const {expectedRevision,...values}=body;window.gifts.draft={...values,revision:expectedRevision+1};result={revision:expectedRevision+1};}
   }else if(url==='/api/v1/admin/gifts')result=window.gifts;
   return new Response(JSON.stringify(result),{status});
  };`});
 // Synthetic solid-color PNG previews only; not a QR or bank information.
 await command('Network.enable');await command('Fetch.enable',{patterns:[{urlPattern:'*/api/v1/admin/gifts/assets/asset-*',requestStage:'Request'}]});
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64').toString('base64');
 const prior=socket.onmessage;socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.method==='Fetch.requestPaused')void command('Fetch.fulfillRequest',{requestId:message.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/png'}],body:png});else prior(event);};
 const click=label=>evaluate(`[...document.querySelectorAll('.gift-editor button')].find(b=>b.textContent===${JSON.stringify(label)}).click();true`);
 const setInput=async(selector,value)=>{await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus();document.querySelector(${JSON.stringify(selector)}).select();true`);await command('Input.insertText',{text:value});};
 const select=async(index,value)=>evaluate(`(()=>{const e=document.querySelectorAll('.gift-editor select')[${index}];e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
 const upload=()=>evaluate(`(()=>{const input=document.querySelector('.gift-recipient input[type=file]'),transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array([137,80,78,71])],'synthetic.png',{type:'image/png'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
 await command('Page.navigate',{url:origin+'/admin/gifts'});await until(`document.querySelector('.gift-editor')`);
 assert.equal(await evaluate(`document.querySelector('.gift-editor input[type=checkbox]').checked`),false);
 await select(0,'DUAL');await until(`document.querySelectorAll('.gift-recipient').length===2`);
 await setInput('.gift-recipient:nth-child(2) input','Người nhận minh họa B');
 await select(0,'SINGLE');await select(0,'DUAL');
 assert.equal(await evaluate(`document.querySelector('.gift-recipient:nth-child(2) input').value`),'Người nhận minh họa B');
 await select(0,'SINGLE');await setInput('.gift-recipient input','Người nhận minh họa A');
 await upload();await until(`document.querySelector('.gift-editor [role=alert]')?.textContent.includes('QA PNG rejected')`);
 assert.equal(await evaluate(`document.querySelector('.gift-recipient input').value`),'Người nhận minh họa A');
 await upload();await until(`document.querySelector('.gift-qr-preview')?.complete`);
 await evaluate(`document.querySelector('.gift-editor input[type=checkbox]').click();true`);
 await click('Lưu bản nháp');await until(`document.querySelector('.gift-editor [role=alert]')?.textContent.includes('QA save retry')`);
 await click('Lưu bản nháp');await until(`document.querySelector('.gift-editor [role=status]')?.textContent.includes('Đã lưu nháp')`);
 assert.equal(await evaluate(`window.writes.at(-1).body.second.label`),'Người nhận minh họa B');
 assert.equal(await evaluate(`[...document.querySelectorAll('.gift-editor button')].find(b=>b.textContent==='Phát hành cấu hình quà mừng').disabled`),true);
 await evaluate(`document.querySelectorAll('.gift-editor input[type=checkbox]')[1].click();true`);
 await click('Phát hành cấu hình quà mừng');await until(`document.querySelector('.gift-editor [role=alert]')?.textContent.includes('QA publish retry')`);
 await click('Phát hành cấu hình quà mừng');await until(`document.querySelector('.gift-editor [role=status]')?.textContent.includes('Đã phát hành')`);
 assert.deepEqual(await evaluate(`window.writes.at(-1).body`),{expectedRevision:1,expectedPublishedRevision:0,confirmed:true});
 await setInput('.gift-recipient input','Bản nháp giữ khi conflict');await evaluate(`window.conflict=true;true`);await click('Lưu bản nháp');
 await until(`document.querySelector('.gift-editor [role=alert]')?.textContent.includes('QA configuration conflict')`);
 assert.equal(await evaluate(`document.querySelector('.gift-recipient input').value`),'Bản nháp giữ khi conflict');
 await click('Tải lại cấu hình');await until(`document.querySelector('dialog[open]')`);
 await evaluate(`document.querySelector('dialog button').click();true`);await until(`!document.querySelector('dialog')`);
 await click('Tải lại cấu hình');await until(`document.querySelector('dialog[open]')`);
 await evaluate(`[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Xác nhận').click();true`);await until(`!document.querySelector('dialog')`);
 assert.equal(await evaluate(`document.querySelector('.gift-recipient input').value`),'Người nhận minh họa A');
 await select(0,'DUAL');await select(1,'PUBLIC');
 assert.ok(await evaluate(`document.querySelector('.gift-editor').textContent.includes('Người xem thiệp chung có thể xem và tải mã QR')`));
 await evaluate(`document.querySelector('.gift-editor input[type=checkbox]').checked||document.querySelector('.gift-editor input[type=checkbox]').click();true`);
 await click('Lưu bản nháp');await until(`document.querySelector('.gift-editor [role=status]')?.textContent.includes('Đã lưu nháp')`);
 await evaluate(`document.querySelectorAll('.gift-editor input[type=checkbox]')[1].click();true`);
 assert.equal(await evaluate(`[...document.querySelectorAll('.gift-editor button')].find(b=>b.textContent==='Phát hành cấu hình quà mừng').disabled`),true,'Incomplete second recipient cannot publish');
 await evaluate(`document.querySelector('.gift-editor input[type=checkbox]').click();true`);
 await click('Lưu bản nháp');await until(`document.querySelector('.gift-editor [role=status]')?.textContent.includes('Đã lưu nháp')`);
 await click('Phát hành cấu hình quà mừng');await until(`document.querySelector('.gift-editor [role=status]')?.textContent.includes('Đã tắt')`);
 assert.equal(await evaluate(`window.writes.at(-1).body.confirmed`),false);
 for(const width of [390,1440]){
  await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<700});
  assert.ok(await evaluate(`document.documentElement.scrollWidth<=${width}`));
  const shot=await command('Page.captureScreenshot',{format:'png'});writeFileSync(directory+'/gifts-'+width+'.png',Buffer.from(shot.data,'base64'));
 }
 await command('Page.navigate',{url:origin+'/admin/gifts?editor'});await until(`document.querySelector('.admin-main [role=alert]')`);
 assert.equal(await evaluate(`document.querySelector('.gift-editor')`),null);
 assert.equal(await evaluate(`document.querySelector('nav a[href="/admin/gifts"]')`),null);
 assert.deepEqual(errors,[]);
 writeFileSync(directory+'/report.json',JSON.stringify({modeRetainsSecond:true,uploadRetry:true,saveRetry:true,ownerConfirmation:true,publishRetry:true,revisionPayload:true,conflictRetainsDraft:true,reloadConfirmation:true,editorDenied:true,incompleteBlocksPublish:true,publicWarning:true,disableWithoutQrConfirmation:true,viewportWidths:[390,1440]},null,2));
 console.log('GIFT_REVIEW_QA=PASS (isolated fixtures, no real QR/bank data)');
}finally{socket?.close();browser.kill();}
