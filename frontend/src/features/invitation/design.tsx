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
export function WeddingCanvas({design,recipient,salutation,children}:{design:WeddingDesign;recipient?:string;salutation?:string;children?:ReactNode}){
 const color=accents.find(a=>a.id===design.accent)?.color??accents[0].color;
 return <div className={`wedding-canvas theme-${design.theme.toLowerCase()}`} style={{'--wedding-accent':color} as CSSProperties}>
  <header className="wedding-cover"><span className="wedding-ornament" aria-hidden="true">{design.theme==='TRADITIONAL'?'囍':design.theme==='MODERN'?'—':'❧'}</span><p className="eyebrow">{recipient?(salutation||'Trân trọng kính mời'):'Chúng mình kết hôn'}</p>{recipient&&<h2 className="recipient-name">{recipient}</h2>}<h1>{design.names||'Tên hai bạn'}</h1><div className="wedding-rule"/><p className="wedding-message">{design.message}</p></header>
  <div className="wedding-body">{design.heroUrl&&<img className="wedding-hero-image" src={design.heroUrl} alt={`Ảnh của ${design.names||'hai bạn'}`} />}{children}{design.show_story&&design.story.trim()&&<section className="wedding-story"><p className="eyebrow">Hành trình yêu thương</p><h2>Câu chuyện của chúng mình</h2><p>{design.story}</p></section>}{design.albumUrls&&design.albumUrls.length>0&&<section className="wedding-album"><p className="eyebrow">Những khoảnh khắc</p><div className="album-grid">{design.albumUrls.map((url,index)=><img key={url} src={url} alt={`Khoảnh khắc ${index+1} trong album`} loading="lazy" />)}</div></section>}<section className="wedding-thanks"><span aria-hidden="true">♡</span><p>{design.footer}</p></section></div>
 </div>;
}