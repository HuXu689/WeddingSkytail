// Isolated cross-route gift integration QA: all API calls mocked; no real files or backend data touched.
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const origin=process.env.FEATURE_INTEGRATION_QA_ORIGIN??'http://localhost:3000';
const directory=resolve('.qa-artifacts/feature-integration');mkdirSync(directory,{recursive:true});
const browser=spawn(process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run',`--user-data-dir=${directory}/chrome`,'--remote-debugging-port=9246','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket;
try{
 let targets;
 for(let i=0;i<80;i++){try{targets=await(await fetch('http://127.0.0.1:9246/json')).json();break;}catch{await wait(250);}}
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
  if(location.origin===${JSON.stringify(origin)}){
  const blank={enabled:false,mode:'SINGLE',visibility:'PRIVATE',first:{label:'',description:'',assetId:null},second:{label:'',description:'',assetId:null},revision:0};
  const state=JSON.parse(sessionStorage.getItem('feature-fixture')||'null')||{draft:structuredClone(blank),published:structuredClone(blank)};
  window.integrationRequests=[];const original=window.fetch;
  window.fetch=async(input,init)=>{
   const url=String(input);if(!url.startsWith('/api/v1/'))return original(input,init);
   window.integrationRequests.push(url);let result={},status=200;
   const method=init?.method||'GET';
   if(url.endsWith('/csrf'))result={headerName:'X-CSRF',token:'synthetic'};
   else if(url.endsWith('/auth/me'))result={username:'synthetic-owner',role:'OWNER'};
   else if(url==='/api/v1/admin/gifts'){
    if(method==='PUT'){const {expectedRevision,...values}=JSON.parse(init.body);state.draft={...values,revision:expectedRevision+1};result={revision:state.draft.revision};}
    else result=state;
   }else if(url.endsWith('/admin/gifts/publish')){state.published={...structuredClone(state.draft),revision:state.published.revision+1};result={revision:state.published.revision};}
   else if(url.endsWith('/admin/gifts/assets')&&method==='POST')result={id:'synthetic-first'};
   else if(url.includes('/state')){if(location.pathname.includes('revoked')||location.pathname.includes('closed')){status=403;}else if(location.pathname.includes('pin')){status=428;}else result={opened:true};}
   else if(url.endsWith('/gifts')){
    const settings=state.published;const visible=settings.enabled&&(!url.includes('/public/')||settings.visibility==='PUBLIC');
    result={enabled:visible,mode:settings.mode,recipients:visible?[settings.first,...(settings.mode==='DUAL'?[settings.second]:[])]:[]};
   }else if(url.includes('/wishes')||url.includes('/approved-wishes'))result={items:[],nextCursor:null};
   else{
    const design={names:'Hai người minh họa',message:'Dữ liệu kiểm thử tích hợp',theme:'ELEGANT',accent:'OLIVE',story:'',footer:'Cảm ơn',show_story:false,albumUrls:[],sections:[]};
    result=url.includes('/public/')?design:{wedding:design,displayName:'Khách minh họa',salutation:'Kính mời',events:[]};
   }
   sessionStorage.setItem('feature-fixture',JSON.stringify(state));return new Response(JSON.stringify(result),{status});
  };}`});
 await command('Fetch.enable',{patterns:[{urlPattern:'*/gifts/assets/*',requestStage:'Request'}]});
 const prior=socket.onmessage;socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.method==='Fetch.requestPaused')void command('Fetch.fulfillRequest',{requestId:message.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/png'},{name:'Cache-Control',value:'no-store'}],body:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='});else prior(event);};
 const navigate=async path=>{await command('Page.navigate',{url:origin+path});};
 const adminClick=label=>evaluate(`[...document.querySelectorAll('.gift-editor button')].find(b=>b.textContent===${JSON.stringify(label)}).click();true`);
 await navigate('/admin/gifts');await until(`document.querySelector('.gift-editor')`);
 await evaluate(`sessionStorage.removeItem('feature-fixture');document.querySelector('.gift-recipient input').focus();true`);
 await command('Input.insertText',{text:'Người nhận kiểm thử '+ 'Tên dài '.repeat(10)});
 await evaluate(`(()=>{const input=document.querySelector('input[type=file]'),transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array([137,80,78,71])],'synthetic.png',{type:'image/png'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
 await until(`document.querySelector('.gift-qr-preview')?.complete`);
 await evaluate(`document.querySelector('.gift-editor input[type=checkbox]').click();true`);await adminClick('Lưu bản nháp');await until(`document.querySelector('.gift-editor [role=status]')`);
 await navigate('/w/integration');await until(`window.integrationRequests.some(url=>url.endsWith('/gifts'))`);
 assert.equal(await evaluate(`document.querySelector('.gift-trigger')`),null,'Draft cannot affect public');
 await navigate('/admin/gifts');await until(`document.querySelector('.gift-editor')`);
 assert.equal(await evaluate(`document.querySelector('.gift-editor input[type=checkbox]').checked`),true,'Saved draft reloads');
 await evaluate(`document.querySelectorAll('.gift-editor input[type=checkbox]')[1].click();true`);await adminClick('Phát hành cấu hình quà mừng');await until(`document.querySelector('.gift-editor [role=status]')?.textContent.includes('Đã phát hành')`);
 await navigate('/w/integration');await until(`window.integrationRequests.some(url=>url.endsWith('/gifts'))`);assert.equal(await evaluate(`document.querySelector('.gift-trigger')`),null,'PRIVATE must stay hidden public');
 await navigate('/invitation/valid');await until(`document.querySelector('.gift-trigger')`);
 await evaluate(`document.querySelector('.gift-trigger').focus();true`);
 // Wait for React hydration/focus before Enter; keyDown text is a real carriage return.
 assert.equal(await evaluate(`document.activeElement.className`),'gift-trigger');
 await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
 await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
 await until(`document.querySelector('.gift-dialog[open] .gift-qr')?.complete`);
 for(const width of [320,390,768,1440]){await command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<700});assert.ok(await evaluate(`document.querySelector('.gift-dialog').scrollWidth<=document.querySelector('.gift-dialog').clientWidth`));}
 await evaluate(`document.querySelector('.gift-close').click();true`);await until(`!document.querySelector('.gift-dialog')`);
 await navigate('/admin/gifts');await until(`document.querySelector('.gift-editor')`);
 await evaluate(`const select=document.querySelectorAll('.gift-editor select')[1];select.value='PUBLIC';select.dispatchEvent(new Event('change',{bubbles:true}));true`);
 await adminClick('Lưu bản nháp');await until(`document.querySelector('.gift-editor [role=status]')`);
 await navigate('/w/integration');await until(`window.integrationRequests.some(url=>url.endsWith('/gifts'))`);assert.equal(await evaluate(`document.querySelector('.gift-trigger')`),null,'PUBLIC draft still does not publish');
 await navigate('/admin/gifts');await until(`document.querySelector('.gift-editor')`);await evaluate(`document.querySelectorAll('.gift-editor input[type=checkbox]')[1].click();true`);await adminClick('Phát hành cấu hình quà mừng');await until(`document.querySelector('.gift-editor [role=status]')?.textContent.includes('Đã phát hành')`);
 await navigate('/w/integration');await until(`document.querySelector('.gift-trigger')`);
 assert.equal(await evaluate(`window.integrationRequests.some(url=>url.includes('/guest/'))`),false);
 for(const id of ['closed','revoked','pin']){
  await navigate('/invitation/'+id);await until(`document.querySelector('.invitation-entry')&&!document.querySelector('.invitation-entry').getAttribute('aria-busy').includes('true')`);
  assert.equal(await evaluate(`document.querySelector('.gift-trigger,.gift-qr')`),null);
  assert.equal(await evaluate(`window.integrationRequests.some(url=>url.endsWith('/gifts')||url.includes('/gifts/assets/'))`),false);
 }
 assert.deepEqual(errors,[]);
 writeFileSync(directory+'/report.json',JSON.stringify({draftIsolation:true,savedReload:true,privateGuestOnly:true,publicAfterExplicitPublish:true,publicNoGuestCalls:true,closedRevokedPinNoGiftRequests:true,enterOpens:true,longLabelResponsive:[320,390,768,1440],fixtureOnly:true},null,2));
 console.log('FEATURE_INTEGRATION_QA=PASS (cross-route fixture editor/save/reload/publish/public/private; no real data)');
}finally{socket?.close();browser.kill();}
