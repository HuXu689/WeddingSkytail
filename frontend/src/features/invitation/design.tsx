import {Fragment,useEffect,useRef,useState} from 'react';
import type {CSSProperties,ReactNode} from 'react';
import {ContentSections,type ContentSection} from './sections';
import {normalizedLayout,type LayoutItem,type LayoutKey} from './layout';
import {WeddingAlbum} from './album';
import {observeInvitation} from './motion';
import {coupleNames,oneLine,paragraphs,text} from '@/shared/text';
export type Theme='ELEGANT'|'TRADITIONAL'|'MODERN';
export type Accent='OLIVE'|'BURGUNDY'|'NAVY';
export interface WeddingDesign {layout?:LayoutItem[];sections?:ContentSection[];templateVersion?:number;contentSchemaVersion?:number;names:string;message:string;theme:Theme;accent:Accent;story:string;footer:string;show_story:boolean;heroUrl?:string|null;albumUrls?:string[];heroPosition?:string|null;musicUrl?:string|null;show_countdown?:boolean}
export const themes:{id:Theme;name:string;description:string}[]=[
 {id:'ELEGANT',name:'Thanh lịch',description:'Nền kem, nét lá nhẹ và bố cục cân đối.'},
 {id:'TRADITIONAL',name:'Truyền thống',description:'Khung đôi trang trọng, họa tiết song hỷ.'},
 {id:'MODERN',name:'Hiện đại',description:'Chữ lớn, đường nét gọn và bố cục lệch trái.'}
];
export const accents:{id:Accent;name:string;color:string}[]=[{id:'OLIVE',name:'Xanh olive',color:'#52664c'},{id:'BURGUNDY',name:'Đỏ trầm',color:'#823b42'},{id:'NAVY',name:'Xanh đêm',color:'#354e6a'}];
/* text/paragraphs chuyển sang @/shared/text để thiệp khách, editor và backend dùng cùng một quy tắc NFC. */

export function WeddingCanvas({design,recipient,salutation,children,initiallyOpen=true,countdownTo=null}:{design:WeddingDesign;recipient?:string;salutation?:string;children?:ReactNode;initiallyOpen?:boolean;countdownTo?:string|null}){
  const color=accents.find(a=>a.id===design.accent)?.color??accents[0].color;
  const [opened,setOpened]=useState(initiallyOpen);
  // Music never autoplays: the guest turns it on, and nothing here calls play() on mount (P1).
  const [playing,setPlaying]=useState(false); const musicRef=useRef<HTMLAudioElement|null>(null);
  const canvasRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(!opened||!canvasRef.current)return;return observeInvitation(canvasRef.current);},[opened,design.show_story,design.musicUrl,design.albumUrls?.length,design.show_countdown,design.layout]);
  const heroPosition=design.heroPosition||'50% 50%';
  const optional:Record<LayoutKey,ReactNode>={MUSIC:(design.musicUrl&&<div className="music-control reveal"><button type="button" className="secondary" aria-pressed={playing} onClick={()=>{const player=musicRef.current;if(!player)return;if(player.paused)void player.play().catch(()=>setPlaying(false));else player.pause();}}>{playing?'Tắt nhạc nền':'Bật nhạc nền'}</button><span aria-live="polite">{playing?'Đang phát nhạc nền':'Nhạc nền đang tắt'}</span><audio ref={musicRef} src={design.musicUrl} loop preload="none" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}/></div>),COUNTDOWN:(design.show_countdown&&countdownTo&&<Countdown target={countdownTo}/>),STORY:(design.show_story&&design.story.trim()&&<section className="wedding-story reveal"><div><p className="eyebrow">Hành trình yêu thương</p><h2>Câu chuyện của chúng mình</h2></div><div className="story-copy">{paragraphs(design.story).map((part,index)=><p key={`${index}-${part.slice(0,12)}`}>{part}</p>)}</div></section>),CONTENT:(<ContentSections sections={design.sections??[]}/>),ALBUM:(<WeddingAlbum urls={design.albumUrls??[]}/>),THANKS:(<section className="wedding-thanks reveal"><span aria-hidden="true">✦</span><p>{text(design.footer)}</p><small>Thân thương gửi đến bạn</small></section>)};
  return <div ref={canvasRef} className={`wedding-canvas theme-${design.theme.toLowerCase()}`} style={{'--wedding-accent':color} as CSSProperties}>
    <div className={`wedding-inner ${opened?'is-open':''}`}>
      <header className={`wedding-cover ${design.theme==='ELEGANT'&&design.heroUrl?'hero-split':''}`}>
        {design.heroUrl&&<div className="cover-photo"><img src={design.heroUrl} alt={`Ảnh của ${oneLine(design.names)||'hai bạn'}`} style={{objectPosition:heroPosition}} fetchPriority="high" /></div>}
        <div className="cover-content"><span className="wedding-ornament" aria-hidden="true">{design.theme==='TRADITIONAL'?'囍':design.theme==='MODERN'?'—':'❧'}</span><p className="eyebrow reveal">{recipient?(oneLine(salutation||'Trân trọng kính mời')):'Chúng mình kết hôn'}</p>{recipient&&<h2 className="recipient-name reveal">{oneLine(recipient)}</h2>}<h1 className="reveal couple-names">{coupleNames(design.names||'Tên hai bạn').map((part,index)=><Fragment key={`${index}-${part}`}>{index>0&&<span className="couple-join" aria-hidden="true">&amp;</span>}<span className="couple-name">{part}</span></Fragment>)}</h1><div className="wedding-rule"/><p className="wedding-message reveal">{text(design.message)}</p>{!opened&&<button className="open-invitation reveal" onClick={()=>setOpened(true)} aria-label="Mở thiệp">Mở thiệp <span aria-hidden="true">♡</span></button>}<span className="cover-caption reveal">Một ngày · Một đời · Một tình yêu</span></div>
      </header>
      {opened&&<div className="wedding-body">{children&&<section className="wedding-events reveal"><div className="section-intro"><p className="eyebrow">{recipient?'Buổi tiệc được mời':'Ngày vui của chúng mình'}</p><h2>{recipient?'Hẹn gặp bạn tại buổi tiệc':'Hẹn gặp bạn tại ngày chung đôi'}</h2></div>{children}</section>}{normalizedLayout(design.layout).filter(item=>item.enabled).map(item=><Fragment key={item.section}>{optional[item.section]}</Fragment>)}</div>}
    </div>

  </div>;
}

/** Counts down to the nearest upcoming event; the block hides itself once that moment has passed (P1). */
function Countdown({target}:{target:string}){
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),60000);return()=>window.clearInterval(timer);},[]);
  const remaining=new Date(target).getTime()-now;
  if(!Number.isFinite(remaining)||remaining<=0)return null;
  const days=Math.floor(remaining/86400000),hours=Math.floor(remaining/3600000)%24,minutes=Math.floor(remaining/60000)%60;
  return <section className="wedding-countdown reveal"><p className="eyebrow">Đếm ngược</p><h2>{days>0?`Còn ${days} ngày nữa`:'Sắp đến rồi'}</h2><div className="countdown-units"><span><strong>{days}</strong>ngày</span><span><strong>{hours}</strong>giờ</span><span><strong>{minutes}</strong>phút</span></div><p className="countdown-note">Thời gian còn lại tới buổi tiệc gần nhất.</p></section>;
}