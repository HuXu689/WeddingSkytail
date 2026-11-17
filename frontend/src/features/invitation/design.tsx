import {Fragment,useEffect,useRef,useState} from 'react';
import type {CSSProperties,ReactNode} from 'react';
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

export type Theme='ELEGANT'|'TRADITIONAL'|'MODERN';
export type Accent='OLIVE'|'BURGUNDY'|'NAVY';
export interface WeddingDesign {layout?:LayoutItem[];sections?:ContentSection[];templateVersion?:number;contentSchemaVersion?:number;names:string;message:string;theme:Theme;accent:Accent;story:string;footer:string;show_story:boolean;heroUrl?:string|null;albumUrls?:string[];heroPosition?:string|null;musicUrl?:string|null;music_autoplay?:boolean;show_countdown?:boolean}
export const themes:{id:Theme;name:string;description:string}[]=[
 {id:'ELEGANT',name:'Thanh lịch',description:'Nền kem, nét lá nhẹ và bố cục cân đối.'},
 {id:'TRADITIONAL',name:'Truyền thống',description:'Khung đôi trang trọng, họa tiết song hỷ.'},
 {id:'MODERN',name:'Hiện đại',description:'Chữ lớn, đường nét gọn và bố cục lệch trái.'}
];
export const accents:{id:Accent;name:string;color:string}[]=[{id:'OLIVE',name:'Xanh olive',color:'#52664c'},{id:'BURGUNDY',name:'Đỏ trầm',color:'#823b42'},{id:'NAVY',name:'Xanh đêm',color:'#354e6a'}];
/* text/paragraphs chuyển sang @/shared/text để thiệp khách, editor và backend dùng cùng một quy tắc NFC. */

export function WeddingCanvas({design,recipient,salutation,children,calendar,gift,wishes,initiallyOpen=true,countdownTo=null,preview=false}:{design:WeddingDesign;recipient?:string;salutation?:string;children?:ReactNode;calendar?:ReactNode;gift?:ReactNode;wishes?:ReactNode;initiallyOpen?:boolean;countdownTo?:string|null;preview?:boolean}){
 const color=accents.find(a=>a.id===design.accent)?.color??accents[0].color;
 const [opened,setOpened]=useState(initiallyOpen),[curtain,setCurtain]=useState(false);
 const [atmosphere,setAtmosphere]=useState<AtmosphereMode>(design.theme==='TRADITIONAL'?'crimson':'royal');
 const canvasRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!initiallyOpen)setCurtain(false);},[initiallyOpen]);
 useEffect(()=>{if(!opened||!canvasRef.current)return;return observeInvitation(canvasRef.current);},[opened,design.show_story,design.musicUrl,design.albumUrls?.length,design.show_countdown,design.layout,design.sections?.length]);
 const openCanvas=()=>{setCurtain(true);setOpened(true);};
 const heroPosition=design.heroPosition||'50% 50%';
 const optional:Record<LayoutKey,ReactNode>={
  MUSIC:null,
  COUNTDOWN:(design.show_countdown&&countdownTo&&<Countdown target={countdownTo}/>),
  STORY:(design.show_story&&design.story.trim()&&<section className="wedding-story reveal">
   <SectionCornerStickers compact/>
   <div className="story-header-col">
    <StickerBadge sticker="love-letter" label="Chuyện tình đôi lứa"/>
    <p className="eyebrow">Hành trình yêu thương</p>
    <h2>Câu chuyện của chúng mình</h2>
    <div className="story-seal-ornament" aria-hidden="true">
     <WeddingSticker kind="lovebirds" size={76}/>
    </div>
   </div>
   <div className="story-copy">
    {paragraphs(design.story).map((part,index)=><p key={`${index}-${part.slice(0,12)}`}>{part}</p>)}
    <div className="story-wax-stamp" aria-hidden="true">
     <WeddingSticker kind="wax-seal-song-hy" size={44}/>
     <span>Trọn vẹn yêu thương</span>
    </div>
   </div>
  </section>),
  CONTENT:(<ContentSections sections={design.sections??[]}/>),
  ALBUM:(<WeddingAlbum urls={design.albumUrls??[]}/>),
  THANKS:(<section className="wedding-thanks reveal">
   <SectionCornerStickers compact/>
   <div className="thanks-crest-row" aria-hidden="true">
    <WeddingSticker kind={design.theme==='TRADITIONAL'?'wax-seal-song-hy':'lovebirds'} size={64}/>
   </div>
   <span aria-hidden="true">✦</span>
   <p>{text(design.footer)}</p>
   <small>Thân thương gửi đến bạn</small>
   <div className="thanks-ribbon-tag" aria-hidden="true">Trăm năm hạnh phúc · Vĩnh kết đồng tâm</div>
  </section>)
 };
 return <div ref={canvasRef} className={`wedding-canvas theme-${design.theme.toLowerCase()} atmosphere-${atmosphere}${curtain?' cinematic-opening':''}`} style={{'--wedding-accent':color} as CSSProperties}>
   {/* Sân khấu hiệu ứng sticky full viewport — dịu nhẹ, không che chữ */}
   <div className="wedding-effects-viewport" aria-hidden="true">
    <CelebrationOrnaments/>
    <FallingRibbons count={6}/>
    <PetalShower intensity="light"/>
    <GoldenDust count={32}/>
    <ButterflyFlight count={4}/>
    {opened && <FloatingHearts count={12}/>}
    {opened && <Fireworks mode="continuous"/>}
    <SparkleTrail/>
   </div>
   <div className={`wedding-inner ${opened?'is-open':''}`}>
    <header className={`wedding-cover ${design.theme==='ELEGANT'&&design.heroUrl?'hero-split':''}`}>
     <SectionCornerStickers compact={Boolean(design.heroUrl)}/>
     {!design.heroUrl&&<div className="cover-floating-stickers" aria-hidden="true">
      <WeddingSticker kind="floral-arch" className="cover-arch-sticker" size={180}/>
     </div>}
     {design.heroUrl&&<div className="cover-photo"><img src={design.heroUrl} alt={`Ảnh của ${oneLine(design.names)||'hai bạn'}`} style={{objectPosition:heroPosition}} fetchPriority="high" /></div>}
     <div className="cover-content">
      <span className="wedding-ornament" aria-hidden="true">{design.theme==='TRADITIONAL'?'囍':design.theme==='MODERN'?'—':'❧'}</span>
      <p className="eyebrow reveal">{recipient?(oneLine(salutation||'Trân trọng kính mời')):'Chúng mình kết hôn'}</p>
      {recipient&&<h2 className="recipient-name reveal">{oneLine(recipient)}</h2>}
      <h1 className="reveal couple-names">{coupleNames(design.names||'Tên hai bạn').map((part,index)=><Fragment key={`${index}-${part}`}>{index>0&&<span className="couple-join" aria-hidden="true">&amp;</span>}<span className="couple-name">{part}</span></Fragment>)}</h1>
      <div className="wedding-rule"/>
      <p className="wedding-message reveal">{text(design.message)}</p>
      {!opened&&<button className="open-invitation reveal" onClick={openCanvas} aria-label="Mở thiệp">Mở thiệp <span aria-hidden="true">♡</span></button>}
      <span className="cover-caption reveal">Một ngày · Một đời · Một tình yêu</span>
      <div className="cover-royal-footer" aria-hidden="true">
       <span className="cover-motto-pill">✦ Lễ Thành Hôn · Trăm Năm Hạnh Phúc ✦</span>
      </div>
     </div>
    </header>
    {opened&&<div className="wedding-body">
     <CelebrationBar atmosphere={atmosphere} onAtmosphereChange={setAtmosphere}/>
     {calendar}
     {children&&<>
      <OrnateDivider sticker="champagne-toast" caption="Hân hoan chào đón quý khách"/>
      <section className="wedding-events reveal">
       <SectionCornerStickers compact/>
       <div className="section-intro">
        <div>
         <StickerBadge sticker="champagne-toast" label="Tiệc cưới long trọng"/>
         <p className="eyebrow">{recipient?'Buổi tiệc được mời':'Ngày vui của chúng mình'}</p>
         <h2>{recipient?'Hẹn gặp bạn tại buổi tiệc':'Hẹn gặp bạn tại ngày chung đôi'}</h2>
        </div>
        <WeddingSticker kind="lovebirds" size={68}/>
       </div>
       {children}
      </section>
     </>}
     {normalizedLayout(design.layout).filter(item=>item.enabled).map(item=><Fragment key={item.section}>{optional[item.section]}</Fragment>)}
     {gift}
     {wishes}
    </div>}
   </div>
   {opened&&design.musicUrl&&normalizedLayout(design.layout).some(item=>item.section==='MUSIC'&&item.enabled)&&<MusicControl key={design.musicUrl} src={design.musicUrl} autoplay={design.music_autoplay??false} preview={preview} color={color}/>}
  </div>;
}

/** Counts down to the nearest upcoming event; the block hides itself once that moment has passed (P1). */
function Countdown({target}:{target:string}){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
 const remaining=new Date(target).getTime()-now;
 if(!Number.isFinite(remaining)||remaining<=0)return null;
 const days=Math.floor(remaining/86400000),hours=Math.floor(remaining/3600000)%24,minutes=Math.floor(remaining/60000)%60,seconds=Math.floor(remaining/1000)%60;
 return <section className="wedding-countdown reveal">
  <SectionCornerStickers compact/>
  <StickerBadge sticker="wedding-rings" label="Khoảnh khắc thiêng liêng"/>
  <p className="eyebrow">Đếm ngược</p>
  <h2>{days>0?`Còn ${days} ngày nữa`:'Sắp đến rồi'}</h2>
  <div className="countdown-units">
   <span><strong>{days}</strong>ngày</span>
   <span><strong>{hours}</strong>giờ</span>
   <span><strong>{minutes}</strong>phút</span>
   <span><strong>{seconds}</strong>giây</span>
  </div>
  <p className="countdown-note">Thời gian còn lại tới buổi lễ gần nhất.</p>
 </section>;
}
