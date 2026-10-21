// R02: kiểm tra và chụp panel "Nội dung sẽ xuất hiện trên thiệp chung" ở 390/1440.
// Mọi /api/v1 được mô phỏng trong trang (fixture DEMO), không đăng nhập backend, không ghi dữ liệu.
// Chạy khi frontend dev đang chạy: node scripts/rework-editor-panel-qa.mjs
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const origin=process.env.EDITOR_QA_ORIGIN??'http://localhost:3000';
const directory=resolve('.qa-artifacts/rework/R02');mkdirSync(directory,{recursive:true});
const browser=spawn(process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run',`--user-data-dir=${directory}/chrome`,'--remote-debugging-port=9243','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let socket;
try{
 let targets;
 for(let i=0;i<80;i++){try{targets=await(await fetch('http://127.0.0.1:9243/json')).json();break;}catch{await wait(250);}}
 assert.ok(targets,'Chrome DevTools did not start');
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((res,rej)=>{socket.onopen=res;socket.onerror=rej;});
 let serial=0;const pending=new Map();
 socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const t=pending.get(m.id);pending.delete(m.id);m.error?t.reject(m.error):t.resolve(m.result);}};
 const command=(method,params={})=>new Promise((res,rej)=>{const id=++serial;const timeout=setTimeout(()=>{pending.delete(id);rej(Error('CDP timeout: '+method));},30000);pending.set(id,{resolve:v=>{clearTimeout(timeout);res(v);},reject:e=>{clearTimeout(timeout);rej(e);}});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const until=async expression=>{for(let i=0;i<200;i++){if(await evaluate(`Boolean(${expression})`))return;await wait(100);}throw Error('Timeout: '+expression);};
 const screenshot=async name=>{const r=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${directory}/${name}.png`,Buffer.from(r.data,'base64'));};
 const metrics=(width,height)=>command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});
 const layout=[{section:'MUSIC',enabled:false},{section:'COUNTDOWN',enabled:false},{section:'STORY',enabled:false},{section:'CONTENT',enabled:true},{section:'ALBUM',enabled:false},{section:'THANKS',enabled:false}];
 const wedding={version:7,published:true,names:'An & Bình',draft_names:'An & Bình',message:'Lời mời kiểm thử.',draft_message:'Lời mời kiểm thử.',theme:'ELEGANT',draft_theme:'ELEGANT',accent:'OLIVE',draft_accent:'OLIVE',story:'',draft_story:'',footer:'Cảm ơn bạn.',draft_footer:'Cảm ơn bạn.',show_story:false,draft_show_story:false,show_countdown:false,draft_show_countdown:false,music_autoplay:false,draft_music_autoplay:false,draft_music_id:null,musicUrl:null,heroUrl:null,heroPosition:null,albumUrls:[],tracking:false,mode:'MANUAL_OPEN',open_at:null,close_at:null,layout};
 const sections=[
  {kind:'INTRO',audience:'PUBLIC',enabled:true,title:'Giới thiệu hai bạn',body:'',startsAt:null,color:null,payload:{people:[{name:'Người A DEMO',role:'Cô dâu',note:''}]}},
  {kind:'FAMILY',audience:'PRIVATE',enabled:true,title:'Gia đình',body:'',startsAt:null,color:null,payload:{groups:[{label:'Nhà gái',members:[{name:'Thành viên 1',note:''}]}]}},
  {kind:'CEREMONY',audience:'PUBLIC',enabled:true,title:'Nghi lễ riêng',body:'',startsAt:null,color:null,payload:{items:[{title:'Lễ gia tiên DEMO',lead:'',time:null,venue:'',address:'',directions:''}]}},
  {kind:'TIMELINE',audience:'PUBLIC',enabled:true,title:'Mốc lịch trình',body:'',startsAt:null,color:null,payload:{timeline:[{at:'2027-12-20T09:00:00Z',title:'Đón khách DEMO',note:'',venue:'',audience:'PUBLIC',tentative:false},{at:'2027-12-20T01:23:00Z',title:'Lễ gia tiên DEMO',note:'',venue:'',audience:'PRIVATE',tentative:true}]}},
  {kind:'DRESS_CODE',audience:'PUBLIC',enabled:true,title:'Trang phục',body:'Tông sáng.',startsAt:null,color:null,payload:{palette:[{name:'Trắng ngà',color:'#fffdf9'}],avoid:''}}
 ];
 await command('Page.enable');await command('Runtime.enable');
 await command('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.fixture=${JSON.stringify({wedding,sections})};
  const nativeFetch=window.fetch;
  window.fetch=async function(input,init){
   const url=String(input);if(!url.startsWith('/api/v1/'))return nativeFetch(input,init);
   if(url.endsWith('/csrf'))return new Response(JSON.stringify({headerName:'X-CSRF',token:'test'}),{status:200,headers:{'Content-Type':'application/json'}});
   let result={};
   if(url.endsWith('/auth/me'))result={username:'owner',role:'OWNER'};
   else if(url.endsWith('/admin/media'))result=[];
   else if(url.endsWith('/admin/wedding/sections'))result=window.fixture.sections;
   else if(url.endsWith('/admin/wedding/layout'))result=window.fixture.wedding.layout;
   else if(url.endsWith('/admin/wedding'))result=window.fixture.wedding;
   return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});
  };
 `});
 await command('Page.navigate',{url:`${origin}/admin/wedding`});
 await until(`document.querySelector('.public-exposure-panel')`);
 const panelText=await evaluate(`document.querySelector('.public-exposure-panel').textContent`);
 assert.ok(panelText.includes('Đón khách DEMO'),'Panel phải liệt kê mốc công khai');
 assert.ok(!panelText.includes('Lễ gia tiên DEMO'),'Panel không được lộ mốc PRIVATE');
 assert.ok(panelText.includes('Nghi lễ riêng đang bật công khai trên thiệp chung'),'CEREMONY PUBLIC phải có cảnh báo');
 assert.ok(panelText.includes('Chỉ xuất hiện trong lời mời riêng: Gia đình'),'Phải liệt kê mục riêng tư');
 const openedPreview=await evaluate(`(()=>{const d=[...document.querySelectorAll('details')].find(x=>x.querySelector('select option[value="public"]'));if(!d)return 'no-details';d.open=true;const select=d.querySelector('select');select.value='public';select.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
 assert.equal(openedPreview,true,'Không tìm thấy khung xem trước ngữ cảnh');
 await until(`document.body.textContent.includes('Đang ẩn khỏi thiệp chung vì quyền riêng tư')`);
 for(const [width,height,name] of [[390,844,'after-editor-panel-390'],[1440,900,'after-editor-panel-1440']]){
  await metrics(width,height);
  await evaluate(`document.querySelector('.public-exposure-panel').scrollIntoView({block:'start'});true`);
  await wait(200);
  assert.ok(await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),'Tràn ngang ở '+width);
  await screenshot(name);
 }
 console.log('PASS: panel liệt kê đúng mốc PUBLIC, ẩn mốc PRIVATE, cảnh báo CEREMONY PUBLIC, hint ẩn riêng tư; ảnh 390/1440 không tràn ngang');
}finally{socket?.close();browser.kill();}
