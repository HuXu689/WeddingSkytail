'use client';
import {useEffect,useRef,useState,type SyntheticEvent} from 'react';
import {createPortal} from 'react-dom';
import {albumPageCount,albumPageSlice,albumThumbUrl,imageIndex,lightboxFilmstrip,secondaryImages} from './album-window';
import {SectionCornerStickers,StickerBadge,WeddingSticker} from './wedding-stickers';
import {fallbackAlbumUrl} from './media-fallback';

const GRID_PAGE_SIZE=16;

function handleAlbumImgError(event:SyntheticEvent<HTMLImageElement>,fullUrl:string,index:number){
 const img=event.currentTarget;
 const fallback=fallbackAlbumUrl(index);
 const step=img.dataset.fallbackStep||'0';
 if(step==='0'&&fullUrl&&!img.src.endsWith(fullUrl)){
  img.dataset.fallbackStep='1';
  img.src=fullUrl;
 }else if(step!=='2'){
  img.dataset.fallbackStep='2';
  img.src=fallback;
 }
}

export function WeddingAlbum({urls}:{urls:string[]}){
 const [active,setActive]=useState(0),[page,setPage]=useState(0),[lightbox,setLightbox]=useState<number|null>(null);
 const opener=useRef<HTMLButtonElement|null>(null);
 const selected=imageIndex(active,urls.length);
 const totalPages=albumPageCount(urls.length,GRID_PAGE_SIZE);
 const safePage=totalPages>0?Math.max(0,Math.min(page,totalPages-1)):0;
 const gridIndices=albumPageSlice(urls.length,safePage,GRID_PAGE_SIZE);
 function open(index:number,button:HTMLButtonElement){opener.current=button;setActive(index);setPage(Math.floor(index/GRID_PAGE_SIZE));setLightbox(index);}
 function stepFeatured(delta:number){
  const next=imageIndex(selected+delta,urls.length);
  setActive(next);
  setPage(Math.floor(next/GRID_PAGE_SIZE));
 }
 if(!urls.length)return null;
 return <section className="wedding-album reveal">
  <SectionCornerStickers compact/>
  <div className="album-heading">
   <div>
    <StickerBadge sticker="floral-arch" label="Bộ sưu tập kỷ niệm"/>
    <p className="eyebrow">Những khoảnh khắc</p>
    <h2>Album yêu thương</h2>
   </div>
   <div className="album-heading-meta">
    <WeddingSticker kind="butterfly-gold" size={40}/>
    <span>{urls.length} khoảnh khắc</span>
   </div>
  </div>
  <div className={`album-editorial album-gallery count-${Math.min(urls.length,5)}`}>
   <button type="button" className="album-main" onClick={event=>open(selected,event.currentTarget)} aria-haspopup="dialog" aria-label={`Xem ảnh ${selected+1} kích thước lớn`}>
    <img key={urls[selected]} src={urls[selected]} alt={`Khoảnh khắc ${selected+1} trong album`} loading="lazy" decoding="async" onError={e=>handleAlbumImgError(e,urls[selected],selected)}/>
    <span className="album-frame-badge" aria-hidden="true">Ảnh {selected+1} / {urls.length} · Chạm để phóng to</span>
   </button>
   {secondaryImages(selected,urls.length).map((index,slot)=><button type="button" key={`${slot}-${index}`} className={`album-side side-${slot}`} onClick={event=>open(index,event.currentTarget)} aria-haspopup="dialog" aria-label={`Mở ảnh ${index+1}`}>
    <img key={urls[index]} src={albumThumbUrl(urls[index])} alt={`Khoảnh khắc ${index+1}`} loading="lazy" decoding="async" onError={e=>handleAlbumImgError(e,urls[index],index)}/>
    <span className="album-thumb-index" aria-hidden="true">#{index+1}</span>
   </button>)}
  </div>
  {urls.length>1&&<div className="album-controls">
   <button type="button" className="album-arrow" onClick={()=>stepFeatured(-1)} aria-label="Ảnh chính trước">←</button>
   <span role="status" aria-live="polite">Ảnh {selected+1} / {urls.length}</span>
   <button type="button" className="album-arrow" onClick={()=>stepFeatured(1)} aria-label="Ảnh chính tiếp theo">→</button>
  </div>}
  {urls.length>5&&<div className="album-collection" aria-label="Tất cả ảnh trong album">
   <div className="album-collection-head">
    <h3>Toàn bộ bộ sưu tập</h3>
    <span>Trang {safePage+1} / {totalPages} · {urls.length} ảnh</span>
   </div>
   <div className="album-thumb-grid">
    {gridIndices.map(index=><button type="button" key={index} className={`album-thumb-btn${index===selected?' is-featured':''}`} onClick={event=>open(index,event.currentTarget)} aria-haspopup="dialog" aria-label={`Mở ảnh ${index+1} trong album`}>
     <img key={urls[index]} src={albumThumbUrl(urls[index])} alt={`Ảnh ${index+1}`} loading="lazy" decoding="async" onError={e=>handleAlbumImgError(e,urls[index],index)}/>
     <span className="album-thumb-index" aria-hidden="true">{index+1}</span>
    </button>)}
   </div>
   {totalPages>1&&<nav className="album-pagination" aria-label="Trang bộ sưu tập ảnh">
    <button type="button" className="secondary" disabled={safePage===0} onClick={()=>setPage(safePage-1)} aria-label="Trang ảnh trước">← Trước</button>
    <div className="album-page-numbers">
     {Array.from({length:totalPages},(_,p)=><button type="button" key={p} className={p===safePage?'album-page-btn is-current':'album-page-btn'} aria-current={p===safePage?'page':undefined} onClick={()=>setPage(p)}>{p+1}</button>)}
    </div>
    <button type="button" className="secondary" disabled={safePage>=totalPages-1} onClick={()=>setPage(safePage+1)} aria-label="Trang ảnh sau">Sau →</button>
   </nav>}
  </div>}
  {lightbox!==null&&<AlbumLightbox urls={urls} initial={lightbox} opener={opener.current} onClose={()=>setLightbox(null)}/>}
 </section>;
}

function AlbumLightbox({urls,initial,opener,onClose}:{urls:string[];initial:number;opener:HTMLButtonElement|null;onClose:()=>void}){
 const ownerDocument=opener?.ownerDocument??document;
 const dialog=useRef<HTMLDialogElement>(null),closeButton=useRef<HTMLButtonElement>(null),touchStartX=useRef<number|null>(null);
 const [active,setActive]=useState(initial),[failedIndex,setFailedIndex]=useState<number|null>(null);
 const index=imageIndex(active,urls.length);
 const strip=lightboxFilmstrip(index,urls.length,9);
 useEffect(()=>{
  const node=dialog.current;if(!node)return;
  // Native modal dialog supplies focus containment and makes the rest of the document inert.
  node.showModal();closeButton.current?.focus();
  const overflow=ownerDocument.body.style.overflow;ownerDocument.body.style.overflow='hidden';
  return()=>{node.close();ownerDocument.body.style.overflow=overflow;if(opener?.isConnected)opener.focus();};
 },[opener,ownerDocument]);
 return createPortal(<dialog ref={dialog} className="lightbox album-lightbox" aria-label="Xem ảnh album" aria-modal="true"
  onCancel={event=>{event.preventDefault();onClose();}}
  onClick={event=>{if(event.target===event.currentTarget)onClose();}}
  onTouchStart={event=>{touchStartX.current=event.touches[0]?.clientX??null;}}
  onTouchEnd={event=>{
   if(touchStartX.current===null||urls.length<2)return;
   const delta=(event.changedTouches[0]?.clientX??touchStartX.current)-touchStartX.current;
   touchStartX.current=null;
   if(Math.abs(delta)>48)setActive(value=>imageIndex(value+(delta>0?-1:1),urls.length));
  }}
  onKeyDown={event=>{
   if(event.key==='Tab'){
    const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const first=buttons[0],last=buttons[buttons.length-1],focused=ownerDocument.activeElement;
    if(event.shiftKey&&focused===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&focused===last){event.preventDefault();first?.focus();}
   }
   if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();setActive(value=>imageIndex(value+(event.key==='ArrowLeft'?-1:1),urls.length));}
  }}>
  <button ref={closeButton} type="button" className="lightbox-close" onClick={onClose} aria-label="Đóng ảnh album">×</button>
  {urls.length>1&&<button type="button" className="lightbox-nav previous" onClick={()=>setActive(imageIndex(index-1,urls.length))} aria-label="Ảnh trước">←</button>}
  <figure>
   {failedIndex===index
    ?<div className="lightbox-error" role="alert"><p>Chưa tải được ảnh gốc này.</p><button type="button" className="secondary" onClick={()=>setFailedIndex(null)}>Thử tải lại</button></div>
    :<img key={urls[index]} src={urls[index]} alt={`Khoảnh khắc ${index+1} trong album`} decoding="async" onError={e=>{
     const img=e.currentTarget;
     if(img.dataset.fallbackApplied!=='1'){
      img.dataset.fallbackApplied='1';
      img.src=fallbackAlbumUrl(index);
     }else{
      setFailedIndex(index);
     }
    }}/>}
   <figcaption role="status" aria-live="polite">Ảnh {index+1} / {urls.length}</figcaption>
   {urls.length>1&&<div className="lightbox-filmstrip" aria-label="Chọn nhanh ảnh">
    {strip.map(i=><button type="button" key={i} className={i===index?'lightbox-strip-btn is-active':'lightbox-strip-btn'} onClick={()=>{setFailedIndex(null);setActive(i);}} aria-label={`Chuyển tới ảnh ${i+1}`}>
     <img src={albumThumbUrl(urls[i])} alt="" loading="lazy" decoding="async" onError={e=>handleAlbumImgError(e,urls[i],i)}/>
    </button>)}
   </div>}
  </figure>
  {urls.length>1&&<button type="button" className="lightbox-nav next" onClick={()=>setActive(imageIndex(index+1,urls.length))} aria-label="Ảnh tiếp theo">→</button>}
 </dialog>,ownerDocument.body);
}
