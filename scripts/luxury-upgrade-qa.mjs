// Headless Chrome E2E & Mobile Responsive QA cho toàn bộ tính năng nâng cấp cao cấp:
// 1. Cá nhân hóa ?guest=... + Nghi thức Mở Phong Bì 3D
// 2. Chân dung Cô dâu/Chú rể + Cột mốc kỷ niệm tình yêu + Bộ lọc Nghi lễ Nhà Trai/Nhà Gái + Cẩm nang khách mời
// 3. RSVP Care Quick-Tags + Thẻ Hẹn Chung Vui + Sổ Lưu Bút lọc/tìm kiếm/thả tim + Contrast & Mobile 390px
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';

const origin=process.env.LUXURY_QA_ORIGIN??'http://localhost:3005';
const directory=resolve('.qa-artifacts/luxury-upgrade');
mkdirSync(directory,{recursive:true});

const browser=spawn(
  process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless','--disable-gpu','--no-first-run',`--user-data-dir=${directory}/chrome`,'--remote-debugging-port=9245','about:blank'],
  {stdio:'ignore'}
);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let socket;

try{
  let targets;
  for(let i=0;i<80;i++){try{targets=await(await fetch('http://127.0.0.1:9245/json')).json();break;}catch{await wait(250);}}
  assert.ok(targets,'Chrome DevTools did not start');
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((res,rej)=>{socket.onopen=res;socket.onerror=rej;});
  let serial=0;const pending=new Map(),errors=[];
  socket.onmessage=event=>{
    const msg=JSON.parse(event.data);
    if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails);
    if(msg.id){const task=pending.get(msg.id);pending.delete(msg.id);msg.error?task.reject(msg.error):task.resolve(msg.result);}
  };
  const command=(method,params={})=>new Promise((res,rej)=>{
    const id=++serial;
    const timer=setTimeout(()=>{pending.delete(id);rej(Error(`CDP timeout: ${method}`));},30000);
    pending.set(id,{resolve:v=>{clearTimeout(timer);res(v);},reject:e=>{clearTimeout(timer);rej(e);}});
    socket.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>{
    const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});
    if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const until=async expression=>{
    for(let i=0;i<160;i++){if(await evaluate(`Boolean(${expression})`))return;await wait(100);}
    throw Error(`Timeout: ${expression}`);
  };
  const screenshot=async name=>{
    const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    writeFileSync(`${directory}/${name}.png`,Buffer.from(shot.data,'base64'));
  };

  const richSections=[
    {
      kind:'INTRO',audience:'PUBLIC',enabled:true,title:'Chuyện của An & Bình',
      body:'Hành trình tìm thấy bình yên bên nhau.',startsAt:null,color:null,
      payload:{
        people:[
          {name:'Nguyễn Hoàng An',role:'Chú rể',note:'Điềm đạm và ấm áp.',quote:'Bình yên là có em.',avatarUrl:'/fallback/groom-portrait.jpg'},
          {name:'Trần Thanh Bình',role:'Cô dâu',note:'Dịu dàng và rạng rỡ.',quote:'Hạnh phúc từ điều giản dị.',avatarUrl:'/fallback/bride-portrait.jpg'}
        ],
        milestones:[
          {dateLabel:'Mùa thu 2022',title:'Cơn mưa chiều phố Phan Đình Phùng',description:'Tách trà nóng mở đầu câu chuyện.',photoUrl:'/fallback/love-story-1.jpg'},
          {dateLabel:'Tháng 09 · 2026',title:'Lời cầu hôn ngọt ngào',description:'Chiếc nhẫn trao tay dưới hoàng hôn.',photoUrl:'/fallback/love-story-2.jpg'}
        ]
      }
    },
    {
      kind:'FAMILY',audience:'PUBLIC',enabled:true,title:'Gia đình hai bên',body:'',startsAt:null,color:null,
      payload:{
        groups:[
          {label:'Nhà Trai',side:'GROOM',location:'Quận Ba Đình, Hà Nội',welcomeNote:'Trân trọng đón tiếp.',members:[{name:'Ông Nguyễn Văn Minh',note:'Thân phụ'}]},
          {label:'Nhà Gái',side:'BRIDE',location:'Quận Đống Đa, Hà Nội',welcomeNote:'Hân hạnh đón tiếp.',members:[{name:'Ông Trần Quốc Tuấn',note:'Thân phụ'}]}
        ]
      }
    },
    {
      kind:'CEREMONY',audience:'PUBLIC',enabled:true,title:'Nghi lễ hai gia đình',body:'',startsAt:null,color:null,
      payload:{
        items:[
          {title:'Lễ Ăn Hỏi',side:'BRIDE',lead:'Tại tư gia Nhà Gái',time:'2027-12-24T02:00:00Z',venue:'Tư gia Nhà Gái',address:'45 Thái Hà, Hà Nội',mapsUrl:'https://maps.google.com/?q=45+Thai+Ha',dressNote:'Áo dài truyền thống'},
          {title:'Lễ Vu Quy',side:'GROOM',lead:'Tại tư gia Nhà Trai',time:'2027-12-25T01:30:00Z',venue:'Tư gia Nhà Trai',address:'18 Phan Đình Phùng, Hà Nội',mapsUrl:'https://maps.google.com/?q=18+Phan+Dinh+Phung',dressNote:'Trang phục lịch sự'}
        ]
      }
    },
    {
      kind:'TIMELINE',audience:'PUBLIC',enabled:true,title:'Chương trình lễ cưới',body:'',startsAt:null,color:null,
      payload:{
        timeline:[
          {at:'2027-12-25T03:30:00Z',title:'Đón khách & Photobooth',note:'Tiệc trà đón khách.',venue:'Forevermark',side:'JOINT',audience:'PUBLIC',tentative:false},
          {at:'2027-12-25T04:15:00Z',title:'Cử hành hôn lễ',note:'Trao nhẫn cưới.',venue:'Sảnh Arabian',side:'JOINT',audience:'PUBLIC',tentative:false}
        ]
      }
    },
    {
      kind:'DRESS_CODE',audience:'PUBLIC',enabled:true,title:'Trang phục & Lưu ý',body:'Tông sáng trang nhã.',startsAt:null,color:null,
      payload:{
        palette:[{name:'Trắng kem',color:'#f5f2eb'},{name:'Hồng đất',color:'#c89d94'}],
        avoid:'Tránh màu neon.',
        tips:[{title:'Gửi xe miễn phí',detail:'Bãi đỗ ô tô rộng rãi cổng số 2.'},{title:'Thực đơn chay',detail:'Có mâm chay riêng phục vụ chu đáo.'}]
      }
    }
  ];

  const publicData={
    names:'Hoàng An & Thanh Bình',slug:'our-wedding',theme:'ELEGANT',accent:'BURGUNDY',
    message:'Trân trọng kính mời Quý khách tới dự Lễ Thành Hôn của hai con chúng tôi.',
    story:'Mùa thu Hà Nội năm ấy đã đưa chúng mình đến bên nhau.',
    footer:'Cảm ơn bạn đã đến chung vui!',show_story:true,show_countdown:true,
    heroUrl:'/fallback/hero.jpg',albumUrls:['/fallback/hero.jpg','/fallback/portrait.jpg','/fallback/reception.jpg'],
    musicUrl:'/fallback/wedding-melody.wav',music_autoplay:false,sections:richSections,
    layout:[{section:'MUSIC',enabled:true},{section:'COUNTDOWN',enabled:true},{section:'STORY',enabled:true},{section:'CONTENT',enabled:true},{section:'ALBUM',enabled:true},{section:'THANKS',enabled:true}]
  };

  const guestData={
    displayName:'Gia đình Anh Tuấn',salutation:'Trân trọng kính mời',wedding:publicData,
    events:[{
      id:'evt-1',title:'Tiệc Cưới Chính Thức',start_at:'2027-12-25T04:00:00Z',deadline:'2027-12-20T10:00:00Z',
      timezone:'Asia/Ho_Chi_Minh',venue:'Forevermark',address:'614 Lạc Long Quân, Hà Nội',state:'PUBLISHED',
      max_people:4,status:null,total_people:null,note:null,event_note:'Đón khách từ 10:30.',response_version:0,
      rsvp_open:true,maps_url:'https://maps.google.com/?q=Forevermark',dress_code:'Trang nhã',parking:'Miễn phí cổng 2',change_notice:null,revision:0
    }]
  };

  await command('Page.enable');await command('Runtime.enable');
  await command('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.__publicData=${JSON.stringify(publicData)};
    window.__guestData=${JSON.stringify(guestData)};
    const nativeFetch=window.fetch;
    window.fetch=async(input,init)=>{
      const url=String(input);
      if(!url.startsWith('/api/v1/'))return nativeFetch(input,init);
      if(url.endsWith('/csrf'))return new Response(JSON.stringify({headerName:'X-CSRF',token:'qa'}),{status:200,headers:{'Content-Type':'application/json'}});
      if(url.includes('/gifts'))return new Response(JSON.stringify({enabled:false,mode:'SINGLE',recipients:[]}),{status:200,headers:{'Content-Type':'application/json'}});
      if(url.includes('/wishes')||url.includes('/approved-wishes')){
        const items=[
          {id:'w1',display_name:'Bạn Minh',message:'Chúc hai bạn trăm năm hạnh phúc!',created_at:'2026-11-01T00:00:00Z',pinned:true},
          {id:'w2',display_name:'Chị Lan',message:'Mãi yêu thương nhau nhé!',created_at:'2026-11-02T00:00:00Z',pinned:false},
          {id:'w3',display_name:'Anh Khoa',message:'Sớm đón thiên thần nhỏ!',created_at:'2026-11-03T00:00:00Z',pinned:false}
        ];
        return new Response(JSON.stringify({items,nextCursor:null}),{status:200,headers:{'Content-Type':'application/json'}});
      }
      if(url.includes('/public/weddings/'))return new Response(JSON.stringify(window.__publicData),{status:200,headers:{'Content-Type':'application/json'}});
      if(url.endsWith('/state'))return new Response(JSON.stringify({opened:true}),{status:200,headers:{'Content-Type':'application/json'}});
      if(url.endsWith('/rsvp')&&init?.method==='PUT'){
        const body=JSON.parse(init.body);
        Object.assign(window.__guestData.events[0],{status:body.status,total_people:body.totalPeople,note:body.note,response_version:1});
        return new Response('{}',{status:200,headers:{'Content-Type':'application/json'}});
      }
      if(url.includes('/guest/invitations/'))return new Response(JSON.stringify(window.__guestData),{status:200,headers:{'Content-Type':'application/json'}});
      return new Response('{}',{status:200,headers:{'Content-Type':'application/json'}});
    };
  `});

  // 1. Kiểm thử Mobile 390px với cá nhân hóa ?guest=... & Nghi thức Phong Bì 3D
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await command('Page.navigate',{url:`${origin}/w/our-wedding?guest=${encodeURIComponent('Anh Tuấn & Gia đình')}&salutation=${encodeURIComponent('Thân mời')}`});
  await until(`document.querySelector('.envelope-ceremony-card')`);
  assert.equal(await evaluate(`document.querySelector('.ceremony-guest-title')?.textContent`),'Anh Tuấn & Gia đình');
  await screenshot('01-mobile-envelope-ceremony');
  await evaluate(`document.querySelector('.ceremony-open-btn').click();true`);
  await until(`!document.querySelector('.envelope-ceremony-backdrop')`);
  assert.equal(await evaluate(`document.querySelector('.recipient-name')?.textContent`),'Anh Tuấn & Gia đình');
  assert.equal(await evaluate(`document.documentElement.scrollWidth<=390`),true,'Mobile 390px không được tràn ngang');

  // 2. Kiểm thử Chân dung + Cột mốc tình yêu + Bộ lọc Nghi lễ + Palette + Cẩm nang + Sổ lưu bút
  assert.equal(await evaluate(`document.querySelectorAll('.intro-person-portrait img').length`),2);
  assert.equal(await evaluate(`document.querySelectorAll('.love-milestone-card').length`),2);
  assert.equal(await evaluate(`document.querySelectorAll('.guest-tip-card').length`),2);
  await evaluate(`[...document.querySelectorAll('.side-filter-btn')].find(b=>b.textContent.includes('Lễ Nhà Gái')).click();true`);
  await wait(120);
  assert.equal(await evaluate(`document.querySelectorAll('.ceremony-card').length`),1);
  await evaluate(`document.querySelector('.dress-swatch-btn').click();true`);
  await until(`document.querySelector('.dress-swatch-preview')`);
  assert.equal(await evaluate(`Boolean(document.querySelector('.wish-feed-toolbar'))`),true);
  await evaluate(`document.querySelector('.wish-heart-btn').click();true`);
  await wait(120);
  assert.equal(await evaluate(`document.querySelector('.wish-heart-btn.is-liked span')?.textContent`),'1');
  await screenshot('02-mobile-public-personalized');

  // 3. Kiểm thử RSVP thông minh + Thẻ Hẹn Chung Vui trên trang khách riêng
  await command('Page.navigate',{url:`${origin}/invitation/qa-guest-1`});
  await until(`document.querySelector('.rsvp-form')`);
  await evaluate(`document.querySelector('#response-evt-1 summary').click();true`);
  await wait(150);
  await evaluate(`[...document.querySelectorAll('.rsvp-care-chip')].find(b=>b.textContent.includes('Thực đơn chay')).click();true`);
  await wait(100);
  assert.match(await evaluate(`document.querySelector('.rsvp-form textarea').value`),/\[Thực đơn chay\]/);
  await evaluate(`document.querySelector('.rsvp-form').requestSubmit();true`);
  await until(`document.querySelector('.wedding-pass-card')`);
  assert.match(await evaluate(`document.querySelector('.wedding-pass-card').textContent`),/Thẻ hẹn chung vui/);
  assert.equal(await evaluate(`document.documentElement.scrollWidth<=390`),true,'Trang lời mời riêng mobile 390px không tràn ngang');
  await screenshot('03-mobile-smart-rsvp-pass');

  // 4. Kiểm tra contrast computed trên toàn bộ trang
  const contrastSrc=readFileSync(resolve('scripts/contrast-audit.mjs'),'utf8').replace(/export\s+/g,'');
  const contrastFailures=await evaluate(`(()=>{${contrastSrc};return inspectContrast().failures;})()`);
  assert.deepEqual(contrastFailures,[],'Không có lỗi tương phản computed trên các thành phần mới');
  assert.equal(errors.length,0,`Uncaught runtime errors: ${JSON.stringify(errors)}`);

  console.log('PASS: luxury-upgrade-qa — Envelope 3D, Cá nhân hóa URL, Chân dung & Cột mốc tình yêu, Lọc Nhà Trai/Nhà Gái, Cẩm nang khách mời, RSVP Care Tags & Thẻ hẹn, Lưu bút Live & Contrast Mobile 390px đều PASS!');
}finally{
  socket?.close();
  browser.kill();
}
