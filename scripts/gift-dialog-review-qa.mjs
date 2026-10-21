// Isolated guest gift dialog QA: all API calls mocked; no real files or backend data touched.
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const origin=process.env.GIFT_DIALOG_QA_ORIGIN??'http://localhost:3000';
const directory=resolve('.qa-artifacts/gift-dialog-review');mkdirSync(directory,{recursive:true});
const browser=spawn(process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run',`--user-data-dir=${directory}/chrome`,'--remote-debugging-port=9245','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket;
try{
 let targets;
 for(let i=0;i<80;i++){try{targets=await(await fetch('http://127.0.0.1:9245/json')).json();break;}catch{await wait(250);}}
 assert.ok(targets,'Chrome DevTools did not start');
 socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let serial=0;const pending=new Map(),errors=[];
 socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);if(message.id){const task=pending.get(message.id);pending.delete(message.id);message.error?task.reject(message.error):task.resolve(message.result);}};
 const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;const timeout=setTimeout(()=>{pending.delete(id);reject(Error(`CDP timeout: ${method}`));},30000);pending.set(id,{resolve:value=>{clearTimeout(timeout);resolve(value);},reject:error=>{clearTimeout(timeout);reject(error);}});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const response=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(response.exceptionDetails)throw Error(JSON.stringify(response.exceptionDetails));return response.result.value;};
 const until=async expression=>{for(let i=0;i<200;i++){if(await evaluate(`Boolean(${expression})`))return;await wait(100);}throw Error(`Timeout: ${expression}`);};
 await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
 await command('Network.setCacheDisabled',{cacheDisabled:true});
 await command('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.giftReads=0;window.assetReads=0;window.assetFailure=false;window.downloadFailure=false;
   const design={names:'Hai người minh họa',message:'Thiệp kiểm thử',theme:new URLSearchParams(location.search).get('theme')||'ELEGANT',accent:new URLSearchParams(location.search).get('accent')||'OLIVE',story:'',footer:'Cảm ơn',show_story:false,albumUrls:[]};
  const original=window.fetch;window.fetch=async(input,init)=>{
   const url=String(input);if(!url.startsWith('/api/v1/'))return original(input,init);
   if(url.includes('/assets/')){if(window.downloadFailure)return new Response('{}',{status:403});return new Response(new Uint8Array([137,80,78,71]),{status:200,headers:{'Content-Type':'image/png'}});}
   let result={};
   if(url.endsWith('/state'))result={opened:true};
   else if(url.endsWith('/gifts')){window.giftReads++;if(window.giftFailure)return new Response('{}',{status:503});result={enabled:!location.pathname.includes('off'),mode:location.pathname.includes('single')?'SINGLE':'DUAL',recipients:[{label:'Người nhận minh họa A',description:'Mô tả minh họa',assetId:window.assetFailure?'qa-broken':'qa-first'},...(location.pathname.includes('single')?[]:[{label:'Người nhận minh họa B',description:'',assetId:'qa-second'}])]};}
   else if(url.includes('approved-wishes')||url.endsWith('/wishes'))result={items:[],nextCursor:null};
   else if(url.includes('/public/weddings/'))result=design;
   else result={wedding:design,displayName:'Khách minh họa',salutation:'Kính mời',events:[]};
   return new Response(JSON.stringify(result),{status:200});
  };`});
 await command('Fetch.enable',{patterns:[{urlPattern:'*/gifts/assets/*',requestStage:'Request'}]});
 const prior=socket.onmessage;let assetRequests=[];
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
 socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.method==='Fetch.requestPaused'){
  assetRequests.push(message.params.request.url);
  void evaluate('window.assetFailure').then(fail=>command('Fetch.fulfillRequest',{requestId:message.params.requestId,responseCode:fail?403:200,responseHeaders:[{name:'Content-Type',value:fail?'application/json':'image/png'},{name:'Cache-Control',value:'no-store, private'}],body:fail?'e30=':png}));
 }else prior(event);};
 const click=label=>evaluate(`[...document.querySelectorAll('.gift-dialog button')].find(b=>b.textContent===${JSON.stringify(label)}).click();true`);
 const open=async()=>{await evaluate(`document.querySelector('.gift-trigger').click();true`);await until(`document.querySelector('.gift-dialog[open] .gift-qr')?.complete`);};
 await command('Page.navigate',{url:origin+'/invitation/dual-fixture'});await until(`document.querySelector('.gift-trigger')`);
 assert.equal(assetRequests.length,0,'No QR image before user opens');
 await open();assert.ok(assetRequests[0].includes('/guest/invitations/dual-fixture/gifts/assets/qa-first'));
 assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`),'Đóng hộp quà');
 await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
 await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
 assert.equal(await evaluate(`document.querySelector('.gift-dialog').contains(document.activeElement)`),true);
 await click('Người nhận minh họa B');await until(`document.querySelector('.gift-qr')?.src.endsWith('qa-second')&&document.querySelector('.gift-qr').complete`);
 assert.equal(await evaluate(`document.querySelectorAll('.gift-qr').length`),1);
 await until(`!document.querySelector('.gift-dialog .row button').disabled`);
 await click('Người nhận minh họa B');
 assert.equal(await evaluate(`document.querySelector('.gift-dialog .row button').disabled`),false,'Selecting active recipient must keep download ready');
 assert.equal(await evaluate(`document.querySelector('.gift-options button[aria-pressed=true]').textContent`),'Người nhận minh họa B');
 await evaluate(`window.downloadFailure=true;true`);await click('Tải ảnh QR');await until(`document.querySelector('.gift-dialog [role=alert]')?.textContent.includes('Chưa tải được ảnh')`);
 assert.ok(await evaluate(`document.querySelector('.gift-dialog a').href.endsWith('qa-second')`));
 await evaluate(`window.downloadFailure=false;true`);await click('Tải ảnh QR');await until(`!document.querySelector('.gift-dialog [role=alert]')`);
 await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until(`!document.querySelector('.gift-dialog')`);
 assert.equal(await evaluate(`document.activeElement.className`),'gift-trigger');assert.equal(await evaluate(`document.body.style.overflow`),'');
 await command('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
 await command('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
 await until(`document.querySelector('.gift-dialog[open]')`);
 await command('Input.dispatchMouseEvent',{type:'mousePressed',x:1,y:1,button:'left',clickCount:1});
 await command('Input.dispatchMouseEvent',{type:'mouseReleased',x:1,y:1,button:'left',clickCount:1});
 await until(`!document.querySelector('.gift-dialog')`);
 await evaluate(`window.giftFailure=true;document.querySelector('.gift-trigger').click();true`);await until(`document.querySelector('.gift-dialog [role=alert]')`);await evaluate(`window.giftFailure=false;true`);await click('Thử tải lại hộp quà');await until(`document.querySelector('.gift-qr')?.complete`);
 await click('Đóng ×');await until(`!document.querySelector('.gift-dialog')`);
 await evaluate(`window.assetFailure=true;document.querySelector('.gift-trigger').click();true`);await until(`document.querySelector('.gift-dialog [role=alert]')?.textContent.includes('Chưa tải được ảnh QR')`);
 await evaluate(`window.assetFailure=false;true`);await click('Thử tải lại ảnh');await until(`document.querySelector('.gift-qr')?.naturalWidth>0`);
 for(const width of [320,390,768,1440]){
  await command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<700});
  assert.ok(await evaluate(`document.querySelector('.gift-dialog').scrollWidth<=document.querySelector('.gift-dialog').clientWidth`));
  const shot=await command('Page.captureScreenshot',{format:'png'});writeFileSync(directory+'/gift-'+width+'.png',Buffer.from(shot.data,'base64'));
 }
 await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.gift-dialog-content')).animationName`),'none');
 await click('Đóng ×');await until(`!document.querySelector('.gift-dialog')`);
 await command('Page.navigate',{url:origin+'/w/single-fixture'});await until(`document.querySelector('.gift-trigger')`);assetRequests=[];await open();
 assert.ok(assetRequests[0].includes('/public/weddings/single-fixture/gifts/assets/qa-first'));
 assert.equal(await evaluate(`document.querySelector('.gift-options')`),null);
  const xssText='<img src=x onerror="window.__giftXss=true">';
  await evaluate(`(()=>{const previous=window.fetch;window.fetch=async(input,init)=>String(input).endsWith('/gifts')?new Response(JSON.stringify({enabled:true,mode:'SINGLE',recipients:[{label:${JSON.stringify(xssText)},description:${JSON.stringify(xssText)},assetId:'qa-first'}]}),{status:200}):previous(input,init);return true;})()`);
  await click('Đóng ×');await until(`!document.querySelector('.gift-dialog')`);await open();
  assert.equal(await evaluate(`document.querySelector('.gift-dialog h3').textContent`),xssText);
  assert.equal(await evaluate(`document.querySelector('.gift-description img')`),null);
  assert.equal(await evaluate(`window.__giftXss===true`),false);
 await click('Đóng ×');await until(`!document.querySelector('.gift-dialog')`);
 await command('Page.navigate',{url:origin+'/w/off-fixture'});await until(`window.giftReads>=1`);assert.equal(await evaluate(`document.querySelector('.gift-trigger')`),null);
 assert.deepEqual(errors,[]);
  const contrastSource=readFileSync(resolve('scripts/contrast-audit.mjs'),'utf8').replace(/export\s+/g,'');
  const contrastResults=[];
  for(const theme of ['ELEGANT','TRADITIONAL','MODERN'])for(const accent of ['OLIVE','BURGUNDY','NAVY']){
   await command('Page.navigate',{url:origin+'/w/single-fixture?theme='+theme+'&accent='+accent});await until(`document.querySelector('.gift-trigger')`);
   await open();await until(`!document.querySelector('.gift-dialog .row button').disabled`);
   const contrast=await evaluate(`(()=>{${contrastSource};return inspectContrast(document.querySelector('.gift-dialog'));})()`);
   assert.ok(contrast.samples.length>=7,'Dialog text must be sampled');assert.deepEqual(contrast.failures,[]);
   assert.equal(contrast.pending.length,0,'Solid dialog backgrounds must be measurable without pixel fallback');
   contrastResults.push({theme,accent,measured:contrast.samples.length,worst:Math.min(...contrast.samples.map(s=>s.ratio)),skipped:contrast.skipped.length});
   await click('Đóng ×');await until(`!document.querySelector('.gift-dialog')`);
  }
  writeFileSync(directory+'/report.json',JSON.stringify({deferredAssets:true,guestScope:true,publicScope:true,singleDual:true,escapeFocusRestore:true,requestRetry:true,imageRetry:true,downloadRetryFallback:true,reducedMotion:true,disabledHidden:true,widths:[320,390,768,1440],contrast:contrastResults},null,2));
 console.log('GIFT_DIALOG_QA=PASS (synthetic fixtures, no real QR or bank data)');
}finally{socket?.close();browser.kill();}
