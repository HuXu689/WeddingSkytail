import {Fragment,useEffect,useRef,useState} from 'react';
import type {CSSProperties,ReactNode} from 'react';
import {MailOpen} from 'lucide-react';
import {ContentSections,type ContentSection} from './sections';
import {normalizedLayout,type LayoutItem,type LayoutKey} from './layout';
import {WeddingAlbum} from './album';
import {MusicControl} from './music-control';
import {observeInvitation} from './motion';
import {coupleNames,oneLine,paragraphs,text} from '@/shared/text';
import {PetalShower} from './petal-shower';
import {GoldenDust} from './golden-dust';
import {FloatingHearts} from './floating-hearts';
import {CelebrationOrnaments} from './celebration-ornaments';
import {SparkleTrail} from './sparkle-trail';
import {Fireworks} from './fireworks';
import {FallingRibbons} from './falling-ribbons';
import {CelebrationBar,type AtmosphereMode} from './celebration-bar';
import {ButterflyFlight} from './butterfly-flight';
import {OrnateDivider,SectionCornerStickers,StickerBadge,WeddingSticker} from './wedding-stickers';
import {FALLBACK_HERO_BY_THEME} from './media-fallback';
import {InvitationQuickNav} from './invitation-nav';
import {EnvelopeCeremonyOverlay} from './envelope-ceremony';
import {parsePublicGuestGreeting,type PublicGuestGreeting} from './guest-greeting';

export type Theme='ELEGANT'|'TRADITIONAL'|'MODERN';
export type Accent='OLIVE'|'BURGUNDY'|'NAVY';
export interface WeddingDesign {layout?:LayoutItem[];sections?:ContentSection[];templateVersion?:number;contentSchemaVersion?:number;names:string;message:string;theme:Theme;accent:Accent;story:string;footer:string;show_story:boolean;heroUrl?:string|null;albumUrls?:string[];heroPosition?:string|null;musicUrl?:string|null;music_autoplay?:boolean;show_countdown?:boolean}
export const themes:{id:Theme;name:string;description:string}[]=[
 {id:'ELEGANT',name:'Thanh lịch',description:'Giấy kem ngà, đường chỉ vàng champagne và bố cục biên tập tinh tế.'},
 {id:'TRADITIONAL',name:'Truyền thống',description:'Phong vị Á Đông trang trọng, dấu ấn Song Hỷ ấm áp.'},
 {id:'MODERN',name:'Hiện đại',description:'Tối giản đương đại, tương phản sắc nét và nhịp điệu khoáng đạt.'}
];
export const accents:{id:Accent;name:string;color:string}[]=[{id:'OLIVE',name:'Xanh olive',color:'#52664c'},{id:'BURGUNDY',name:'Đỏ trầm',color:'#823b42'},{id:'NAVY',name:'Xanh đêm',color:'#354e6a'}];
/* text/paragraphs chuyển sang @/shared/text để thiệp khách, editor và backend dùng cùng một quy tắc NFC. */

const countdownDateFormatter=new Intl.DateTimeFormat('vi-VN',{
 weekday:'long',
 day:'2-digit',
 month:'2-digit',
 year:'numeric',
 hour:'2-digit',
 minute:'2-digit',
 timeZone:'Asia/Ho_Chi_Minh',
});

function ScrollProgressBar(){
 const [progress,setProgress]=useState(0);
 useEffect(()=>{
  let raf=0;
  const update=()=>{
   raf=0;
   const doc=document.documentElement;
   const total=doc.scrollHeight-doc.clientHeight;
   if(total<=40){setProgress(0);return;}
   setProgress(Math.max(0,Math.min(1,window.scrollY/total)));
  };
  const onScroll=()=>{if(!raf)raf=window.requestAnimationFrame(update);};
  update();
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onScroll,{passive:true});
  return()=>{
   if(raf)window.cancelAnimationFrame(raf);
   window.removeEventListener('scroll',onScroll);
   window.removeEventListener('resize',onScroll);
  };
 },[]);
 return <div className="invitation-scroll-progress" aria-hidden="true">
  <span className="invitation-scroll-progress-bar" style={{transform:`scaleX(${progress.toFixed(4)})`}}/>
 </div>;
}

export function WeddingCanvas({design,recipient,salutation,children,calendar,gift,wishes,initiallyOpen=true,countdownTo=null,preview=false,publicMode=false}:{design:WeddingDesign;recipient?:string;salutation?:string;children?:ReactNode;calendar?:ReactNode;gift?:ReactNode;wishes?:ReactNode;initiallyOpen?:boolean;countdownTo?:string|null;preview?:boolean;publicMode?:boolean}){
 const color=accents.find(a=>a.id===design.accent)?.color??accents[0].color;
 const [opened,setOpened]=useState(initiallyOpen),[curtain,setCurtain]=useState(false);
 const [atmosphere,setAtmosphere]=useState<AtmosphereMode>(design.theme==='TRADITIONAL'?'crimson':'royal');
 const [effectsEnabled,setEffectsEnabled]=useState(true);
 const [failedHeroUrl,setFailedHeroUrl]=useState<string|null>(null);
 const [publicGreeting,setPublicGreeting]=useState<PublicGuestGreeting|null>(null);
 const [showEnvelopeOverlay,setShowEnvelopeOverlay]=useState(false);
 const canvasRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!initiallyOpen)setCurtain(false);},[initiallyOpen]);
 useEffect(()=>{
  if(!publicMode||preview||typeof window==='undefined')return;
  const parsed=parsePublicGuestGreeting(window.location.search);
  if(parsed){
   setPublicGreeting(parsed);
   if(parsed.openCeremony)setShowEnvelopeOverlay(true);
  }
 },[publicMode,preview]);
 useEffect(()=>{if(!opened||!canvasRef.current)return;return observeInvitation(canvasRef.current);},[opened,design.show_story,design.musicUrl,design.albumUrls?.length,design.show_countdown,design.layout,design.sections?.length]);
 const openCanvas=()=>{setCurtain(true);setOpened(true);};
 const effectiveRecipient=recipient||(publicGreeting?.guestName?publicGreeting.guestName:undefined);
 const effectiveSalutation=salutation||(publicGreeting?.salutation?publicGreeting.salutation:undefined);
 const heroPosition=design.heroPosition||'50% 50%';
 const fallbackHero=FALLBACK_HERO_BY_THEME[design.theme]??FALLBACK_HERO_BY_THEME.ELEGANT;
 const resolvedHeroSrc=design.heroUrl?(failedHeroUrl===design.heroUrl?fallbackHero:design.heroUrl):null;
 const optional:Record<LayoutKey,ReactNode>={
  MUSIC:null,
  COUNTDOWN:(design.show_countdown&&countdownTo&&<Countdown target={countdownTo}/>),
  STORY:(design.show_story&&design.story.trim()&&<section id="inv-story" className="wedding-story reveal">
   <SectionCornerStickers compact/>
   <div className="story-header-col">
    <StickerBadge sticker="love-letter" label="Chuyện tình đôi lứa"/>
    <p className="eyebrow">Hành trình yêu thương</p>
    <h2>Câu chuyện của chúng mình</h2>
    <div className="story-seal-ornament" aria-hidden="true">
     <WeddingSticker kind="lovebirds" size={68}/>
    </div>
   </div>
   <div className="story-copy">
    {paragraphs(design.story).map((part,index)=><p key={`${index}-${part.slice(0,12)}`}>{part}</p>)}
    <div className="story-wax-stamp" aria-hidden="true">
     <WeddingSticker kind="wax-seal-song-hy" size={40}/>
     <span>Trọn vẹn yêu thương</span>
    </div>
   </div>
  </section>),
  CONTENT:(<div id="inv-sections"><ContentSections sections={design.sections??[]}/></div>),
  ALBUM:(<div id="inv-album"><WeddingAlbum urls={design.albumUrls??[]}/></div>),
  THANKS:(<section className="wedding-thanks reveal">
   <SectionCornerStickers compact/>
   <div className="thanks-crest-row" aria-hidden="true">
    <WeddingSticker kind={design.theme==='TRADITIONAL'?'wax-seal-song-hy':'lovebirds'} size={58}/>
   </div>
   <span aria-hidden="true">✦</span>
   <p>{text(design.footer)}</p>
   <small>Thân thương gửi đến bạn</small>
   <div className="thanks-ribbon-tag" aria-hidden="true">Trăm năm hạnh phúc · Vĩnh kết đồng tâm</div>
  </section>)
 };
 return <div ref={canvasRef} className={`wedding-canvas theme-${design.theme.toLowerCase()} atmosphere-${atmosphere}${curtain?' cinematic-opening':''}`} style={{'--wedding-accent':color} as CSSProperties}>
   {!preview&&opened&&<ScrollProgressBar/>}
   {showEnvelopeOverlay&&!preview&&<EnvelopeCeremonyOverlay names={design.names} guestName={effectiveRecipient} salutation={effectiveSalutation} onComplete={()=>setShowEnvelopeOverlay(false)}/>}
   {/* Sân khấu hiệu ứng sticky full viewport — tiết chế sang trọng, tự ngủ đông khi nghỉ */}
   <div className="wedding-effects-viewport" aria-hidden="true">
    <CelebrationOrnaments/>
    <FallingRibbons count={atmosphere==='royal'||atmosphere==='crimson'?3:0} active={effectsEnabled}/>
    <PetalShower intensity={atmosphere==='sakura'||atmosphere==='crimson'?'light':'burst'} active={effectsEnabled}/>
    <GoldenDust count={atmosphere==='starlight'?24:atmosphere==='royal'?18:atmosphere==='crimson'?12:0} active={effectsEnabled}/>
    <ButterflyFlight count={atmosphere==='sakura'||atmosphere==='royal'?2:0} active={effectsEnabled}/>
    {opened && <FloatingHearts count={0} active={effectsEnabled}/>}
    {opened && <Fireworks mode="burst" active={effectsEnabled}/>}
    {effectsEnabled && <SparkleTrail/>}
   </div>
   <div className={`wedding-inner ${opened?'is-open':''}`}>
    <header className={`wedding-cover ${design.theme==='ELEGANT'&&design.heroUrl?'hero-split':''}`}>
     <SectionCornerStickers compact={Boolean(design.heroUrl)}/>
     {!design.heroUrl&&<div className="cover-floating-stickers" aria-hidden="true">
      <WeddingSticker kind="floral-arch" className="cover-arch-sticker" size={168}/>
     </div>}
     {design.heroUrl&&<div className="cover-photo"><img src={resolvedHeroSrc??fallbackHero} alt={`Ảnh của ${oneLine(design.names)||'hai bạn'}`} style={{objectPosition:heroPosition}} fetchPriority="high" onError={()=>{if(design.heroUrl&&failedHeroUrl!==design.heroUrl)setFailedHeroUrl(design.heroUrl);}} /></div>}
     <div className="cover-content">
      <span className="wedding-ornament" aria-hidden="true">{design.theme==='TRADITIONAL'?'囍':design.theme==='MODERN'?'—':'❧'}</span>
      <p className="eyebrow reveal">{effectiveRecipient?(oneLine(effectiveSalutation||'Trân trọng kính mời')):'Chúng mình kết hôn'}</p>
      {effectiveRecipient&&<h2 className="recipient-name reveal">{oneLine(effectiveRecipient)}</h2>}
      <h1 className="reveal couple-names">{coupleNames(design.names||'Tên hai bạn').map((part,index)=><Fragment key={`${index}-${part}`}>{index>0&&<span className="couple-join" aria-hidden="true">&amp;</span>}<span className="couple-name">{part}</span></Fragment>)}</h1>
      <div className="wedding-rule"/>
      <p className="wedding-message reveal">{text(design.message)}</p>
      {!opened&&<button className="open-invitation reveal" onClick={openCanvas} aria-label="Mở thiệp">Mở thiệp <span aria-hidden="true">♡</span></button>}
      {publicMode&&!preview&&opened&&<div className="cover-ceremony-replay">
       <button type="button" className="secondary cover-envelope-replay-btn" onClick={()=>setShowEnvelopeOverlay(true)}>
        <MailOpen size={15} aria-hidden="true"/>
        <span>Mở nghi thức phong thư</span>
       </button>
      </div>}
      <span className="cover-caption reveal">Một ngày · Một đời · Một tình yêu</span>
      <div className="cover-royal-footer" aria-hidden="true">
       <span className="cover-motto-pill">✦ Lễ Thành Hôn · Trăm Năm Hạnh Phúc ✦</span>
      </div>
     </div>
    </header>
    {opened&&<div className="wedding-body">
     {!preview&&<InvitationQuickNav rootRef={canvasRef}/>}
     {calendar&&<div id="inv-calendar">{calendar}</div>}
     {children&&<>
      <OrnateDivider sticker="champagne-toast" caption="Hân hoan chào đón quý khách"/>
      <section id="inv-events" className="wedding-events reveal">
       <SectionCornerStickers compact/>
       <div className="section-intro">
        <div>
         <StickerBadge sticker="champagne-toast" label="Tiệc cưới long trọng"/>
         <p className="eyebrow">{effectiveRecipient?'Buổi tiệc được mời':'Ngày vui của chúng mình'}</p>
         <h2>{effectiveRecipient?'Hẹn gặp bạn tại buổi tiệc':'Hẹn gặp bạn tại ngày chung đôi'}</h2>
        </div>
        <WeddingSticker kind="lovebirds" size={62}/>
       </div>
       {children}
      </section>
     </>}
     {normalizedLayout(design.layout).filter(item=>item.enabled).map(item=><Fragment key={item.section}>{optional[item.section]}</Fragment>)}
     {gift&&<div id="inv-gift">{gift}</div>}
     {wishes&&<div id="inv-wishes">{wishes}</div>}
     <CelebrationBar atmosphere={atmosphere} onAtmosphereChange={setAtmosphere} effectsEnabled={effectsEnabled} onToggleEffects={()=>setEffectsEnabled(v=>!v)}/>
    </div>}
   </div>
   {opened&&design.musicUrl&&normalizedLayout(design.layout).some(item=>item.section==='MUSIC'&&item.enabled)&&<MusicControl key={design.musicUrl} src={design.musicUrl} autoplay={design.music_autoplay??false} preview={preview} color={color}/>}
  </div>;
}

/** Counts down to the nearest upcoming event; celebrates on the wedding day and hides once well past (P1). */
function Countdown({target}:{target:string}){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
 const targetMs=new Date(target).getTime();
 const remaining=targetMs-now;
 if(!Number.isFinite(remaining)||remaining<=-18*3600000)return null;
 if(remaining<=0){
  return <section className="wedding-countdown is-wedding-day reveal">
   <SectionCornerStickers compact/>
   <StickerBadge sticker="wedding-rings" label="Ngày trọng đại đã tới"/>
   <p className="eyebrow">Hân hoan đón mừng</p>
   <h2>Hôm nay là ngày chung đôi!</h2>
   <p className="countdown-note">Cảm ơn bạn đã dành trọn yêu thương và hiện diện trong khoảnh khắc thiêng liêng này.</p>
  </section>;
 }
 const days=Math.floor(remaining/86400000),hours=Math.floor(remaining/3600000)%24,minutes=Math.floor(remaining/60000)%60,seconds=Math.floor(remaining/1000)%60;
 const pad=(n:number)=>String(n).padStart(2,'0');
 const formattedTarget=countdownDateFormatter.format(new Date(targetMs));
 return <section className="wedding-countdown reveal">
  <SectionCornerStickers compact/>
  <StickerBadge sticker="wedding-rings" label="Khoảnh khắc thiêng liêng"/>
  <p className="eyebrow">Đếm ngược</p>
  <h2>{days>0?`Còn ${days} ngày nữa`:'Sắp đến rồi'}</h2>
  <div className="countdown-units">
   <span><strong>{pad(days)}</strong>ngày</span>
   <span><strong>{pad(hours)}</strong>giờ</span>
   <span><strong>{pad(minutes)}</strong>phút</span>
   <span><strong>{pad(seconds)}</strong>giây</span>
  </div>
  <p className="countdown-target-date">{formattedTarget} (GMT+7)</p>
  <p className="countdown-note">Thời gian còn lại tới buổi lễ gần nhất.</p>
 </section>;
}
