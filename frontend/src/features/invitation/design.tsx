import {useEffect,useState} from 'react';
import type {CSSProperties,ReactNode} from 'react';
export type Theme='ELEGANT'|'TRADITIONAL'|'MODERN';
export type Accent='OLIVE'|'BURGUNDY'|'NAVY';
export interface WeddingDesign {names:string;message:string;theme:Theme;accent:Accent;story:string;footer:string;show_story:boolean;heroUrl?:string|null;albumUrls?:string[]}
export const themes:{id:Theme;name:string;description:string}[]=[
 {id:'ELEGANT',name:'Thanh lịch',description:'Nền kem, nét lá nhẹ và bố cục cân đối.'},
 {id:'TRADITIONAL',name:'Truyền thống',description:'Khung đôi trang trọng, họa tiết song hỷ.'},
 {id:'MODERN',name:'Hiện đại',description:'Chữ lớn, đường nét gọn và bố cục lệch trái.'}
];
export const accents:{id:Accent;name:string;color:string}[]=[{id:'OLIVE',name:'Xanh olive',color:'#52664c'},{id:'BURGUNDY',name:'Đỏ trầm',color:'#823b42'},{id:'NAVY',name:'Xanh đêm',color:'#354e6a'}];
export function WeddingCanvas({design,recipient,salutation,children,initiallyOpen=false}:{design:WeddingDesign;recipient?:string;salutation?:string;children?:ReactNode;initiallyOpen?:boolean}){
 const color=accents.find(a=>a.id===design.accent)?.color??accents[0].color;
  const album=design.albumUrls??[]; const [opened,setOpened]=useState(initiallyOpen); const [active,setActive]=useState(0); const [lightbox,setLightbox]=useState<number|null>(null);
  useEffect(()=>{if(album.length<2||lightbox!==null)return;const timer=window.setInterval(()=>setActive(index=>(index+1)%album.length),4200);return()=>window.clearInterval(timer);},[album.length,lightbox]);
  const move=(offset:number)=>setActive(index=>(index+offset+album.length)%album.length);
 return <div className={`wedding-canvas theme-${design.theme.toLowerCase()}`} style={{'--wedding-accent':color} as CSSProperties}>
    <div className={`wedding-inner ${opened?'is-open':''}`}>
     <header className="wedding-cover"><span className="wedding-ornament" aria-hidden="true">{design.theme==='TRADITIONAL'?'囍':design.theme==='MODERN'?'—':'❧'}</span><p className="eyebrow">{recipient?(salutation||'Trân trọng kính mời'):'Chúng mình kết hôn'}</p>{recipient&&<h2 className="recipient-name">{recipient}</h2>}<h1>{design.names||'Tên hai bạn'}</h1><div className="wedding-rule"/><p className="wedding-message">{design.message}</p><button className="open-invitation" onClick={()=>setOpened(true)} aria-label="Mở thiệp">Mở thiệp <span aria-hidden="true">♡</span></button><span className="cover-caption">Một ngày · Một đời · Một tình yêu</span></header>
     <div className="wedding-body">{design.heroUrl&&<figure className="wedding-hero"><img className="wedding-hero-image" src={design.heroUrl} alt={`Ảnh của ${design.names||'hai bạn'}`} /><figcaption>Khoảnh khắc chúng mình muốn lưu giữ cùng bạn</figcaption></figure>}{children&&<section className="wedding-events"><div className="section-intro"><p className="eyebrow">Ngày vui của chúng mình</p><h2>Hẹn gặp bạn tại buổi tiệc</h2></div>{children}</section>}{design.show_story&&design.story.trim()&&<section className="wedding-story"><p className="eyebrow">Hành trình yêu thương</p><h2>Câu chuyện của chúng mình</h2><p>{design.story}</p><span className="story-signature">♡</span></section>}{album.length>0&&<section className="wedding-album"><p className="eyebrow">Những khoảnh khắc</p><h2>Album yêu thương</h2><div className="album-feature"><button className="album-arrow" onClick={()=>move(-1)} aria-label="Ảnh trước">‹</button><button className="album-main" onClick={()=>setLightbox(active)} aria-label="Xem ảnh lớn"><img src={album[active]} alt={`Khoảnh khắc ${active+1} trong album`} /></button><button className="album-arrow" onClick={()=>move(1)} aria-label="Ảnh tiếp theo">›</button></div><div className="album-dots" aria-label="Chọn ảnh">{album.map((url,index)=><button key={url} className={index===active?'active':''} onClick={()=>setActive(index)} aria-label={`Ảnh ${index+1}`} />)}</div></section>}<section className="wedding-thanks"><span aria-hidden="true">♡</span><p>{design.footer}</p><small>Thân thương gửi đến bạn</small></section></div>
   </div>
   {lightbox!==null&&<div className="lightbox" role="dialog" aria-modal="true" aria-label="Xem ảnh album" onClick={()=>setLightbox(null)}><button className="lightbox-close" onClick={()=>setLightbox(null)} aria-label="Đóng">×</button><img src={album[lightbox]} alt={`Khoảnh khắc ${lightbox+1} trong album`} onClick={event=>event.stopPropagation()} /></div>}
 </div>;
}