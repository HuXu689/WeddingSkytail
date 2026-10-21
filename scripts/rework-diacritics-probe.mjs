// R04: probe nguyên nhân lệch dấu tiếng Việt ở chữ serif cỡ lớn (P03).
// Đo code point DOM, computed font, khe hở giữa các glyph và thử từng giả thuyết
// (kerning, feature settings, font stack, weight, cỡ chữ) ngay trong trang.
// Mock API fixture DEMO trong trang; không backend, không dữ liệu thật.
// Dùng: node scripts/rework-diacritics-probe.mjs
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const origin=process.env.INVITATION_QA_ORIGIN??'http://localhost:3000';
const directory=resolve('.qa-artifacts/rework/R04');mkdirSync(directory,{recursive:true});
const browser=spawn(process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--disable-gpu','--no-first-run',`--user-data-dir=${directory}/chrome`,'--remote-debugging-port=9245','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let socket;
try{
 let targets;
 for(let i=0;i<80;i++){try{targets=await(await fetch('http://127.0.0.1:9245/json')).json();break;}catch{await wait(250);}}
 assert.ok(targets,'Chrome DevTools did not start');
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((res,rej)=>{socket.onopen=res;socket.onerror=rej;});
 let serial=0;const pending=new Map();
 socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const t=pending.get(m.id);pending.delete(m.id);m.error?t.reject(m.error):t.resolve(m.result);}};
 const command=(method,params={})=>new Promise((res,rej)=>{const id=++serial;const timeout=setTimeout(()=>{pending.delete(id);rej(Error('CDP timeout: '+method));},30000);pending.set(id,{resolve:v=>{clearTimeout(timeout);res(v);},reject:e=>{clearTimeout(timeout);rej(e);}});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const until=async expression=>{for(let i=0;i<200;i++){if(await evaluate(`Boolean(${expression})`))return;await wait(100);}throw Error('Timeout: '+expression);};
 const picture='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#b3bca8"/><circle cx="450" cy="400" r="160" fill="#52664c"/></svg>');
 const design={names:'Trần Thanh Bình & Lê Hải Đăng',message:'Lời mời DEMO.',theme:'ELEGANT',accent:'OLIVE',story:'Chuyện mình DEMO.',footer:'Cảm ơn.',show_story:false,heroUrl:picture,albumUrls:[],show_countdown:false,layout:[{section:'MUSIC',enabled:false},{section:'COUNTDOWN',enabled:false},{section:'STORY',enabled:false},{section:'CONTENT',enabled:true},{section:'ALBUM',enabled:false},{section:'THANKS',enabled:false}],sections:[
  {kind:'INTRO',audience:'PUBLIC',enabled:true,title:'Giới thiệu hai bạn',body:'Lời dẫn DEMO.',startsAt:null,color:null,payload:{people:[{name:'Trần Thanh Bình',role:'Cô dâu',note:''}]}},
  {kind:'FAMILY',audience:'PUBLIC',enabled:true,title:'Gia đình',body:'',startsAt:null,color:null,payload:{groups:[{label:'Nhà gái',members:[{name:'Ông Trần Quốc Tuấn',note:'Mẹ'}]}]}},
  {kind:'CEREMONY',audience:'PUBLIC',enabled:true,title:'Nghi lễ riêng',body:'',startsAt:null,color:null,payload:{items:[{title:'Lễ gia tiên',lead:'',time:null,venue:'',address:'',directions:''}]}},
  {kind:'TIMELINE',audience:'PUBLIC',enabled:true,title:'Mốc lịch trình',body:'',startsAt:null,color:null,payload:{timeline:[{at:'2027-12-20T09:00:00Z',title:'Đón khách',note:'',venue:'Sảnh',audience:'PUBLIC',tentative:false}]}},
  {kind:'DRESS_CODE',audience:'PUBLIC',enabled:true,title:'Trang phục',body:'Tông sáng.',startsAt:null,color:null,payload:{palette:[{name:'Trắng ngà',color:'#fffdf9'}],avoid:''}}
 ]};
 await command('Page.enable');await command('Runtime.enable');
 await command('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.design=${JSON.stringify(design)};
  const nativeFetch=window.fetch;
  window.fetch=async function(input,init){
   const url=String(input);if(!url.startsWith('/api/v1/'))return nativeFetch(input,init);
   if(url.includes('/wishes')||url.includes('/approved-wishes'))return new Response(JSON.stringify({items:[],nextCursor:null}),{status:200,headers:{'Content-Type':'application/json'}});
   if(url.includes('/gift'))return new Response(JSON.stringify({enabled:false}),{status:200,headers:{'Content-Type':'application/json'}});
   if(url.includes('/public/weddings/'))return new Response(JSON.stringify(window.design),{status:200,headers:{'Content-Type':'application/json'}});
   return new Response(JSON.stringify({}),{status:200,headers:{'Content-Type':'application/json'}});
  };
 `});
 await command('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await command('Page.navigate',{url:`${origin}/w/rework-demo`});
 await until(`document.querySelector('.intro-person-name')&&document.querySelector('.family-member-name')`);
 const probe=await evaluate(`(()=>{
  const out={samples:[],toggles:[]};
  const gapOf=(el)=>{
   const text=el.firstChild&&el.firstChild.nodeType===3?el.firstChild:el;
   const node=el.firstChild&&el.firstChild.nodeType===3?el.firstChild:null;
   if(!node)return null;
   const str=node.textContent;const rects=[];
   for(let i=0;i<str.length;i++){const r=document.createRange();r.setStart(node,i);r.setEnd(node,i+1);rects.push(r.getBoundingClientRect());}
   const gaps=[];for(let i=1;i<rects.length;i++)gaps.push(Number((rects[i].left-rects[i-1].right).toFixed(2)));
   return {str,codepoints:[...str].map(c=>c.codePointAt(0).toString(16)),gaps};
  };
  const info=(selector)=>{
   const el=document.querySelector(selector);if(!el)return null;
   const cs=getComputedStyle(el);
   return {selector,text:gapOf(el),fontFamily:cs.fontFamily,fontSize:cs.fontSize,fontWeight:cs.fontWeight,letterSpacing:cs.letterSpacing,fontKerning:cs.fontKerning,fontFeatureSettings:cs.fontFeatureSettings,fontVariantLigatures:cs.fontVariantLigatures,textRendering:cs.textRendering,wordSpacing:cs.wordSpacing,overflowWrap:cs.overflowWrap,whiteSpace:cs.whiteSpace};
  };
  for(const s of ['.intro-person-name','.family-member-name','.invitation-section-heading h2','.wedding-cover h1 .couple-name','.content-ceremony h3'])out.samples.push(info(s));
  const el=document.querySelector('.intro-person-name');
  const baseline=gapOf(el);
  const tries=[['fontKerning','none'],['fontFeatureSettings','"kern" 0'],['fontVariantLigatures','none'],['letterSpacing','0px'],['fontFamily','"Times New Roman",Times,serif'],['fontFamily','Georgia,serif'],['fontFamily','Arial,sans-serif'],['fontWeight','600'],['fontSynthesis','none'],['textRendering','geometricPrecision'],['overflowWrap','normal'],['fontSize','19px'],['whiteSpace','nowrap']];
  for(const [prop,value] of tries){
   el.style[prop]=value;
   const after=gapOf(el);
   out.toggles.push({prop,value,maxGap:after?Math.max(...after.gaps):null});
   el.style[prop]='';
  }
  out.baselineMaxGap=baseline?Math.max(...baseline.gaps):null;
  const fam=gapOf(document.querySelector('.family-member-name'));
  out.familyMaxGap=fam?Math.max(...fam.gaps):null;
  return out;
 })()`);
 const clips=[['.intro-person-name',null,'clip-intro-base'],['.intro-person-name','auto','clip-intro-auto'],['.wedding-cover h1 .couple-name',null,'clip-cover-base'],['.wedding-cover h1 .couple-name','auto','clip-cover-auto']];
 for(const [selector,rendering,name] of clips){
  await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'center'});el.classList.add('is-visible');if(${JSON.stringify(rendering)})el.style.textRendering=${JSON.stringify(rendering)};return true;})()`);
  await wait(900);
  const dbg=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});const sec=el.closest('.content-section')||el.closest('.wedding-cover');return {sy:window.scrollY,ry:Math.round(el.getBoundingClientRect().y),op:getComputedStyle(el).opacity,secOp:sec?getComputedStyle(sec).opacity:null,secCls:sec?sec.className:null};})()`);
  probe.debug=probe.debug||{};probe.debug[name]=dbg;
  const view=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  writeFileSync(`${directory}/view-${name}.png`,Buffer.from(view.data,'base64'));
  const box=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:Math.max(0,Math.floor(r.x)),y:Math.max(0,Math.floor(r.y)),width:Math.ceil(r.width),height:Math.ceil(r.height)};})()`);
  const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{x:box.x,y:box.y,width:box.width,height:box.height,scale:1}});
  writeFileSync(`${directory}/${name}.png`,Buffer.from(shot.data,'base64'));
  await evaluate(`(()=>{document.querySelector(${JSON.stringify(selector)}).style.textRendering='';return true;})()`);
 }
 const ink=await evaluate(`(()=>{
  const fonts=['36px "Times New Roman", Times, serif','19px "Times New Roman", Times, serif','26px "Times New Roman", Times, serif','34px "Times New Roman", Times, serif','64px "Times New Roman", Times, serif','36px Georgia, serif','36px Arial, sans-serif','600 36px "Times New Roman", Times, serif'];
  const out=[];
  const canvas=document.createElement('canvas');canvas.width=700;canvas.height=140;const ctx=canvas.getContext('2d',{willReadFrequently:true});
  for(const f of fonts){
   ctx.clearRect(0,0,700,140);ctx.font=f;ctx.fillStyle='#000';ctx.textBaseline='middle';ctx.fillText('Trần',10,70);
   const data=ctx.getImageData(0,0,700,140).data;
   const runs=[];let runStart=-1,firstInk=-1,lastInk=-1;
   for(let x=0;x<700;x++){
    let inked=false;for(let y=0;y<140;y++){if(data[(y*700+x)*4+3]>10){inked=true;break;}}
    if(inked){if(firstInk<0)firstInk=x;lastInk=x;if(runStart>=0){runs.push([runStart,x-1]);runStart=-1;}}
    else if(firstInk>=0&&runStart<0)runStart=x;
   }
   if(runStart>=0)runs.push([runStart,699]);
   const inner=runs.filter(r=>r[0]>firstInk&&r[1]<lastInk);
   out.push({font:f,maxInnerBlank:inner.length?Math.max(...inner.map(r=>r[1]-r[0]+1)):0,inkWidth:lastInk-firstInk+1});
  }
  return out;
 })()`);
 probe.ink=ink;
 writeFileSync(`${directory}/probe.json`,JSON.stringify(probe,null,1));
 console.log(JSON.stringify({baselineMaxGap:probe.baselineMaxGap,familyMaxGap:probe.familyMaxGap,ink},null,1));
}finally{socket?.close();browser.kill();}
