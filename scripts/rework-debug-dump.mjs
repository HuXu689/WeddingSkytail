// Debug dump nhanh cho R05: trạng thái cover/album/compat vars trên trang public fixture.
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
const origin=process.env.INVITATION_QA_ORIGIN??'http://localhost:3000';
const browser=spawn(process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run',`--user-data-dir=${resolve('.qa-artifacts/rework/R05/chrome-dbg')}`,'--remote-debugging-port=9246','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let socket;
try{
 let targets;
 for(let i=0;i<80;i++){try{targets=await(await fetch('http://127.0.0.1:9246/json')).json();break;}catch{await wait(250);}}
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((res,rej)=>{socket.onopen=res;socket.onerror=rej;});
 let serial=0;const pending=new Map();
 socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const t=pending.get(m.id);pending.delete(m.id);m.error?t.reject(m.error):t.resolve(m.result);}};
 const command=(method,params={})=>new Promise((res,rej)=>{const id=++serial;const timeout=setTimeout(()=>{pending.delete(id);rej(Error('timeout '+method));},30000);pending.set(id,{resolve:v=>{clearTimeout(timeout);res(v);},reject:e=>{clearTimeout(timeout);rej(e);}});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const picture='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#b3bca8"/><circle cx="450" cy="400" r="160" fill="#52664c"/></svg>');
 const design={names:'An & Bình',message:'Msg DEMO.',theme:'ELEGANT',accent:'OLIVE',story:'',footer:'Cảm ơn.',show_story:false,heroUrl:picture,albumUrls:[picture,picture],show_countdown:false,layout:[{section:'MUSIC',enabled:false},{section:'COUNTDOWN',enabled:false},{section:'STORY',enabled:false},{section:'CONTENT',enabled:true},{section:'ALBUM',enabled:true},{section:'THANKS',enabled:false}],sections:[{kind:'INTRO',audience:'PUBLIC',enabled:true,title:'Giới thiệu',body:'Lead DEMO.',startsAt:null,color:null,payload:{people:[{name:'An',role:'Cô dâu',note:''}]}}]};
 await command('Page.enable');await command('Runtime.enable');
 await command('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.design=${JSON.stringify(design)};
  const nativeFetch=window.fetch;
  window.fetch=async function(input,init){
   const url=String(input);if(!url.startsWith('/api/v1/'))return nativeFetch(input,init);
   if(url.includes('/wishes'))return new Response(JSON.stringify({items:[],nextCursor:null}),{status:200});
   if(url.includes('/gift'))return new Response(JSON.stringify({enabled:false}),{status:200});
   if(url.includes('/public/weddings/'))return new Response(JSON.stringify(window.design),{status:200,headers:{'Content-Type':'application/json'}});
   return new Response(JSON.stringify({}),{status:200});
  };
 `});
 await command('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await command('Page.navigate',{url:`${origin}/w/rework-demo`});
 for(let i=0;i<100;i++){if(await evaluate(`Boolean(document.querySelector('.content-intro'))`))break;await wait(100);}
 const dump=await evaluate(`(()=>{
  const cover=document.querySelector('.wedding-cover');
  const img=document.querySelector('.cover-photo img');
  const canvas=document.querySelector('.wedding-canvas');
  const cs=getComputedStyle(cover);
  return {
   coverClass:cover?cover.className:null,
   coverBg:cs.backgroundColor,
   imgPresent:!!img,
   imgComplete:img?img.complete:null,
   imgNatural:img?img.naturalWidth:null,
   imgSrcHead:img?img.getAttribute('src').slice(0,40):null,
   album:!!document.querySelector('.wedding-album'),
   albumMain:!!document.querySelector('.album-main'),
   compatVar:canvas?getComputedStyle(canvas).getPropertyValue('--compat-color-263229').trim():null,
   invPaper:canvas?getComputedStyle(canvas).getPropertyValue('--inv-paper').trim():null,
   designHero:window.design?String(window.design.heroUrl).slice(0,30):null,
   designAlbum:window.design?window.design.albumUrls.length:null,
   stylesheets:performance.getEntriesByType('resource').filter(r=>r.name.includes('.css')).map(r=>r.name.split('/').pop())
  };
 })()`);
 console.log(JSON.stringify(dump,null,1));
}finally{socket?.close();browser.kill();}
