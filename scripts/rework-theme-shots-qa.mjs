// R03+: chụp thiệp public (fixture DEMO) theo 3 theme × 390/768/1440 để so sánh trước/sau.
// Mọi /api/v1 mô phỏng trong trang; không backend, không dữ liệu thật.
// Dùng: node scripts/rework-theme-shots-qa.mjs <prefix>   (prefix: before|after)
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const prefix=process.argv[2]??'shot';
const origin=process.env.INVITATION_QA_ORIGIN??'http://localhost:3000';
const directory=resolve(process.env.REWORK_SHOTS_DIR??'.qa-artifacts/rework/R03');mkdirSync(directory,{recursive:true});
const browser=spawn(process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run',`--user-data-dir=${directory}/chrome-${prefix}`,'--remote-debugging-port=9244','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let socket;
try{
 let targets;
 for(let i=0;i<80;i++){try{targets=await(await fetch('http://127.0.0.1:9244/json')).json();break;}catch{await wait(250);}}
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
 const picture='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#b3bca8"/><circle cx="450" cy="400" r="160" fill="#52664c"/></svg>');
 // WAV câm ~0.2s để music control có trạng thái playing thật trong headless (data URI, không tải ngoài).
 const silentWav=(()=>{const rate=8000,samples=1600;const header=Buffer.alloc(44);header.write('RIFF',0);header.writeUInt32LE(36+samples*2,4);header.write('WAVE',8);header.write('fmt ',12);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(samples*2,40);return 'data:audio/wav;base64,'+Buffer.concat([header,Buffer.alloc(samples*2)]).toString('base64');})();
 const heroNone=process.env.REWORK_HERO==='none';
 const sectionsMode=process.env.REWORK_PAGE==='sections';
 const sparse=process.env.REWORK_SPARSE==='1';
 const design={names:'Trần Thanh Bình & Lê Hải Đăng',message:'Trân trọng mời bạn chung vui trong ngày hạnh phúc của chúng mình.',theme:'ELEGANT',accent:'OLIVE',story:'Chúng mình gặp nhau ở một quán cà phê nhỏ.',footer:'Cảm ơn bạn đã đến.',show_story:true,heroUrl:heroNone?null:picture,albumUrls:heroNone?[]:[picture,picture,picture,picture],show_countdown:true,musicUrl:silentWav,layout:[{section:'MUSIC',enabled:true},{section:'COUNTDOWN',enabled:true},{section:'STORY',enabled:true},{section:'CONTENT',enabled:true},{section:'ALBUM',enabled:!heroNone},{section:'THANKS',enabled:true}],sections:[
  {kind:'INTRO',audience:'PUBLIC',enabled:true,title:'Giới thiệu hai bạn',body:'Giữa hàng triệu người trên thế gian, thật may mắn vì chúng mình đã tìm thấy nhau.',startsAt:null,color:null,payload:{people:[{name:'Trần Thanh Bình',role:'Cô dâu',note:'Thích hoa dại.'},{name:'Lê Hải Đăng',role:'Chú rể',note:'Mê cà phê.'}]}},
  {kind:'FAMILY',audience:'PUBLIC',enabled:true,title:'Gia đình',body:'Nơi khởi nguồn của yêu thương, tổ ấm nhỏ.',startsAt:null,color:null,payload:{groups:[{label:'Nhà gái',members:[{name:'Ông Trần Quốc Tuấn',note:'Mẹ'}]},{label:'Nhà trai',members:[{name:'Ông Lê Văn An',note:'Bố'}]}]}},
  {kind:'CEREMONY',audience:'PUBLIC',enabled:true,title:'Nghi lễ riêng',body:'',startsAt:null,color:null,payload:{items:[{title:'Lễ gia tiên',lead:'Kính mời gia đình.',time:null,venue:'Từ gia',address:'12 Lê Lợi',directions:''}]}},
  {kind:'TIMELINE',audience:'PUBLIC',enabled:true,title:'Mốc lịch trình',body:'',startsAt:null,color:null,payload:{timeline:[{at:'2027-12-20T09:00:00Z',title:'Đón khách',note:'',venue:'Sảnh',audience:'PUBLIC',tentative:false},{at:'2027-12-20T11:00:00Z',title:'Nghi lễ',note:'',venue:'Sảnh',audience:'PUBLIC',tentative:false}]}},
  {kind:'DRESS_CODE',audience:'PUBLIC',enabled:true,title:'Trang phục',body:'Tông sáng dịu, tránh màu quá chói.',startsAt:null,color:null,payload:{palette:[{name:'Trắng ngà',color:'#fffdf9'},{name:'Xanh olive',color:'#52664c'}],avoid:'Đen toàn tập'}}
 ]};
 if(sparse){design.sections=design.sections.map(s=>({...s,payload:{...s.payload,people:s.payload?.people?.slice(0,1),groups:s.payload?.groups?.slice(0,1),items:s.payload?.items?.slice(0,1),timeline:s.payload?.timeline?.slice(0,1),palette:s.payload?.palette?.slice(0,1)}}));}
 await command('Page.enable');await command('Runtime.enable');
 await command('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.design=${JSON.stringify(design)};
  const nativeFetch=window.fetch;
  window.fetch=async function(input,init){
   const url=String(input);if(!url.startsWith('/api/v1/'))return nativeFetch(input,init);
   if(url.includes('/wishes')||url.includes('/approved-wishes'))return new Response(JSON.stringify({items:[],nextCursor:null}),{status:200,headers:{'Content-Type':'application/json'}});
   if(url.includes('/gift'))return new Response(JSON.stringify({enabled:false}),{status:200,headers:{'Content-Type':'application/json'}});
   if(url.includes('/guest/invitations/')){
    if(url.endsWith('/state'))return new Response(JSON.stringify({opened:true}),{status:200,headers:{'Content-Type':'application/json'}});
    if(url.endsWith('/open'))return new Response(JSON.stringify({}),{status:200,headers:{'Content-Type':'application/json'}});
    if(url.includes('/rsvp'))return new Response(JSON.stringify({}),{status:200,headers:{'Content-Type':'application/json'}});
    return new Response(JSON.stringify({displayName:'Khách DEMO',salutation:'Trân trọng kính mời',wedding:window.design,events:[{id:'e1',title:'Tiệc DEMO',start_at:'2027-12-20T10:00:00Z',timezone:'Asia/Ho_Chi_Minh',deadline:'2027-11-01T00:00:00Z',venue:'Sảnh DEMO',address:'12 Lê Lợi',state:'PUBLISHED',max_people:4,status:null,total_people:null,note:null,event_note:null,response_version:0,rsvp_open:true,maps_url:null,dress_code:null,parking:null,change_notice:null,revision:1}]}),{status:200,headers:{'Content-Type':'application/json'}});
   }
   if(url.includes('/public/weddings/')){const theme=new URLSearchParams(location.search).get('theme')||'ELEGANT';return new Response(JSON.stringify(Object.assign({},window.design,{theme})),{status:200,headers:{'Content-Type':'application/json'}});}
   return new Response(JSON.stringify({}),{status:200,headers:{'Content-Type':'application/json'}});
  };
 `});
 const guestMode=process.env.REWORK_PAGE==='guest';
 console.error(`[cfg] prefix=${prefix} heroNone=${heroNone} guestMode=${guestMode} sectionsMode=${sectionsMode} sparse=${sparse} dir=${directory}`);
 if(guestMode){
  for(const [width,height] of [[390,844],[1440,900]]){
   await metrics(width,height);
   await command('Page.navigate',{url:`${origin}/invitation/r05-guest`});
   await until(`document.querySelector('.wedding-canvas')`);
   {
    const dbg=await evaluate(`JSON.stringify({countdown:!!document.querySelector('.wedding-countdown'),music:!!document.querySelector('.invitation-music-button'),entry:!!document.querySelector('.invitation-entry'),events:document.querySelectorAll('.event-card').length})`);
    const parsed=JSON.parse(dbg);
    if(!parsed.countdown||!parsed.music)throw Error('Guest thiếu countdown/music: '+dbg);
   }
   await wait(400);
   assert.ok(await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),'Tràn ngang guest '+width);
   await evaluate(`document.querySelector('.wedding-countdown').scrollIntoView({block:'center'});true`);
   await wait(300);
   await screenshot(`${prefix}-guest-countdown-${width}`);
   let playing=false;
   for(let attempt=0;attempt<8&&!playing;attempt++){
    await evaluate(`(()=>{const b=document.querySelector('.invitation-music-button');if(b)b.click();return true;})()`);
    await wait(500);
    playing=await evaluate(`(()=>{const a=document.querySelector('.invitation-music audio');return Boolean(a&&!a.paused);})()`);
   }
   if(!playing)throw Error('Guest không phát được nhạc');
   await wait(300);
   await screenshot(`${prefix}-guest-music-${width}`);
  }
 }else if(sectionsMode){
  for(const [width,height] of [[390,844],[1440,900]]){
   await metrics(width,height);
   await command('Page.navigate',{url:`${origin}/w/rework-demo?theme=ELEGANT`});
   await until(`document.querySelector('.content-dress-code')&&document.querySelectorAll('.content-section').length>=5`);
   await wait(300);
   assert.ok(await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),'Tràn ngang sections '+width);
   for(const [selector,name] of [['.content-intro','intro'],['.content-family','family'],['.content-ceremony','ceremony'],['.content-timeline','timeline'],['.content-dress-code','dress']]){
    await evaluate(`(()=>{const el=document.querySelector('${selector}');el.classList.add('is-visible');el.scrollIntoView({block:'start'});return true;})()`);
    await wait(250);
    let saved=false;
    for(let attempt=0;attempt<3&&!saved;attempt++){
     try{await screenshot(`${prefix}-section-${name}-${width}`);saved=true;}
     catch(error){console.error(`[retry] ${name}-${width} lần ${attempt+1}: ${error.message}`);await wait(800);}
    }
    if(!saved)throw Error(`Không chụp được ${name}-${width}`);
   }
  }
 }else{
  const themeFilter=(process.env.REWORK_THEMES??'ELEGANT,TRADITIONAL,MODERN').split(',').map(item=>item.trim().toUpperCase()).filter(Boolean);
  for(const theme of themeFilter){
   for(const [width,height] of [[390,844],[768,1024],[1440,900]]){
    await metrics(width,height);
    console.error(`[step] ${prefix} ${theme} ${width} navigate`);
    await command('Page.navigate',{url:`${origin}/w/rework-demo?theme=${theme}`});
    await until(`document.querySelector('.content-dress-code')&&document.querySelectorAll('.content-section').length>=5`);
    console.error(`[step] ${prefix} ${theme} ${width} loaded`);
    await wait(400);
    assert.ok(await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),'Tràn ngang ở '+theme+' '+width);
    await evaluate(`window.scrollTo(0,0);true`);await wait(250);await screenshot(`${prefix}-cover-${theme.toLowerCase()}-${width}`);
    if(width===1440&&!heroNone){
     const albumStep=await evaluate(`(()=>{const el=document.querySelector('.album-main');if(!el)return 'MISSING:'+JSON.stringify({album:!!document.querySelector('.wedding-album'),coverPhoto:!!document.querySelector('.cover-photo'),body:!!document.querySelector('.wedding-body'),sections:document.querySelectorAll('.content-section').length});el.scrollIntoView({block:'center'});return 'OK';})()`);
     if(albumStep!=='OK')throw Error('Thiếu album: '+albumStep);
     await wait(300);
     await screenshot(`${prefix}-album-${theme.toLowerCase()}-1440`);
     let clickStep='MISSING';
     for(let attempt=0;attempt<6&&clickStep!=='OK';attempt++){
      clickStep=await evaluate(`(()=>{const el=document.querySelector('.album-main');if(!el)return 'MISSING';el.click();return 'OK';})()`);
      if(clickStep!=='OK')await wait(400);
     }
     if(clickStep!=='OK')throw Error('Không bấm được album chính');
     await until(`document.querySelector('dialog[open]')`);
     await wait(300);
     await screenshot(`${prefix}-lightbox-${theme.toLowerCase()}-1440`);
     await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
     await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
     await until(`!document.querySelector('dialog[open]')`);
    }
   }
  }
 }
 console.log('PASS: ảnh '+prefix+' ('+(guestMode?'guest countdown+music':'3 theme + album + lightbox')+') không tràn ngang');
}finally{socket?.close();browser.kill();}
