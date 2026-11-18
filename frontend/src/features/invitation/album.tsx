'use client';
import {useEffect,useRef,useState,type CSSProperties,type SyntheticEvent} from 'react';
import {createPortal} from 'react-dom';
import {Maximize2,ZoomIn,ZoomOut} from 'lucide-react';
import {albumPageCount,albumPageSlice,albumThumbUrl,imageIndex,lightboxFilmstrip,secondaryImages} from './album-window';
import {SectionCornerStickers,StickerBadge,WeddingSticker} from './wedding-stickers';
import {fallbackAlbumUrl} from './media-fallback';
import {computeStageLayers,useAlbumSlideshow,useFilmstripCenter,useLightboxStage} from './album-slideshow';

const GRID_PAGE_SIZE=16;
const SLIDE_INTERVAL_MS=5200;

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
 const [page,setPage]=useState(0),[lightbox,setLightbox]=useState<number|null>(null);
 const [hovered,setHovered]=useState(false);
 const opener=useRef<HTMLButtonElement|null>(null);
 const progressBarRef=useRef<HTMLSpanElement|null>(null);
 const stageViewportRef=useRef<HTMLSpanElement|null>(null);
 const stageStripRef=useRef<HTMLDivElement|null>(null);
 const touchStateRef=useRef<{x:number;y:number;axis:'x'|'y'|null;dx:number}|null>(null);
 const swipedRef=useRef(false);

 const autoRunning=urls.length>1&&lightbox===null&&!hovered;
 const {stage,selected,goTo,step}=useAlbumSlideshow(urls,autoRunning,SLIDE_INTERVAL_MS,progressBarRef);
 useFilmstripCenter(stageStripRef,selected);

 const totalPages=albumPageCount(urls.length,GRID_PAGE_SIZE);
 const safePage=totalPages>0?Math.max(0,Math.min(page,totalPages-1)):0;
 const gridIndices=albumPageSlice(urls.length,safePage,GRID_PAGE_SIZE);
 const stageStrip=lightboxFilmstrip(selected,urls.length,Math.min(urls.length,20));
 const stageLayers=computeStageLayers(selected,stage.prev,urls.length);
 const nextNeighbor=urls.length>1?imageIndex(selected+1,urls.length):-1;

 function focusSlide(index:number,explicitDir?:1|-1){
  const clean=imageIndex(index,urls.length);
  goTo(clean,explicitDir);
  setPage(Math.floor(clean/GRID_PAGE_SIZE));
 }
 function open(index:number,button:HTMLButtonElement){
  opener.current=button;
  focusSlide(index);
  setLightbox(index);
 }
 function stepFeatured(delta:number){
  const nextClean=imageIndex(selected+delta,urls.length);
  step(delta);
  setPage(Math.floor(nextClean/GRID_PAGE_SIZE));
 }
 function resetStageDrag(){
  const vp=stageViewportRef.current;
  if(vp){
   vp.style.transition='';
   vp.style.transform='';
  }
 }

 if(!urls.length)return null;
 const pad=(n:number)=>String(n).padStart(2,'0');
 const statusDotClass=autoRunning?'album-stage-status-dot is-live':'album-stage-status-dot is-paused';

 return <section
  className={`wedding-album reveal${hovered?' is-paused':''}`}
  onMouseEnter={()=>setHovered(true)}
  onMouseLeave={()=>setHovered(false)}
  onKeyDown={event=>{
   if(lightbox!==null||urls.length<2)return;
   if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
    event.preventDefault();
    stepFeatured(event.key==='ArrowLeft'?-1:1);
   }
  }}
 >
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

  <div className={`album-editorial album-gallery is-presenting count-${Math.min(urls.length,5)}`}>
   <button
    type="button"
    className="album-main"
    onClick={event=>{
     if(swipedRef.current){
      swipedRef.current=false;
      return;
     }
     open(selected,event.currentTarget);
    }}
    onTouchStart={event=>{
     const t=event.touches[0];
     if(!t)return;
     setHovered(true);
     touchStateRef.current={x:t.clientX,y:t.clientY,axis:null,dx:0};
     if(stageViewportRef.current){
      stageViewportRef.current.style.transition='none';
     }
    }}
    onTouchMove={event=>{
     const state=touchStateRef.current;
     const t=event.touches[0];
     if(!state||!t||urls.length<2)return;
     const dx=t.clientX-state.x;
     const dy=t.clientY-state.y;
     if(state.axis===null&&Math.hypot(dx,dy)>8){
      state.axis=Math.abs(dx)>Math.abs(dy)*1.15?'x':'y';
     }
     if(state.axis==='x'){
      state.dx=dx;
      if(stageViewportRef.current){
       const damped=Math.max(-52,Math.min(52,dx*0.3));
       stageViewportRef.current.style.transform=`translate3d(${damped.toFixed(1)}px,0,0)`;
      }
     }
    }}
    onTouchEnd={()=>{
     const state=touchStateRef.current;
     touchStateRef.current=null;
     resetStageDrag();
     setHovered(false);
     if(state&&state.axis==='x'&&Math.abs(state.dx)>38&&urls.length>1){
      swipedRef.current=true;
      stepFeatured(state.dx>0?-1:1);
     }
    }}
    onTouchCancel={()=>{
     touchStateRef.current=null;
     resetStageDrag();
     setHovered(false);
    }}
    aria-haspopup="dialog"
    aria-label={`Xem ảnh ${selected+1} kích thước lớn`}
   >
    <span ref={stageViewportRef} className="album-stage-viewport">
     {stageLayers.map(layerIdx=>{
      const isActive=layerIdx===selected;
      const isLeaving=!isActive&&stage.prev===layerIdx;
      const dirClass=stage.direction<0?'dir-prev':'dir-next';
      const leaveClass=stage.direction<0?'leave-prev':'leave-next';
      const standbyClass=layerIdx===nextNeighbor?'standby-next':'standby-prev';
      const frameClass=isActive
       ?(stage.seq>0&&stage.freshJump?`album-stage-frame is-active is-fresh-jump ${dirClass}`:'album-stage-frame is-active')
       :(isLeaving?`album-stage-frame is-leaving ${leaveClass}`:`album-stage-frame is-standby ${standbyClass}`);
      return <span key={layerIdx} className={frameClass}>
       <img
        className={isActive?'album-stage-current':'album-stage-prev'}
        src={urls[layerIdx]}
        alt={isActive?`Khoảnh khắc ${layerIdx+1} trong album`:''}
        aria-hidden={isActive?undefined:true}
        decoding="async"
        onError={e=>handleAlbumImgError(e,urls[layerIdx],layerIdx)}
       />
      </span>;
     })}
     {stage.seq>0&&<span key={`sheen-${stage.seq}`} className="album-stage-sheen" aria-hidden="true"/>}
    </span>
    <span className="album-stage-scrim" aria-hidden="true"/>
    <span className="album-stage-hud" aria-hidden="true">
     <span className="album-stage-counter">
      <span className={statusDotClass}/>
      <span key={selected} className="album-stage-num">{pad(selected+1)}</span>
      <span className="album-stage-sep">/</span>
      <span className="album-stage-total">{pad(urls.length)}</span>
     </span>
     <span className="album-stage-expand"><Maximize2 size={14}/> Xem toàn màn hình</span>
    </span>
    {urls.length>1&&<span className="album-progress-track" aria-hidden="true">
     <span ref={progressBarRef} className="album-progress-fill"/>
    </span>}
   </button>

   {secondaryImages(selected,urls.length).map((index,slot)=>{
    const prevIdx=stage.sidePrev[slot];
    const hasPrev=prevIdx!==undefined&&prevIdx!==index&&Boolean(urls[prevIdx]);
    const slotLayers=hasPrev?(prevIdx<index?[prevIdx,index]:[index,prevIdx]):[index];
    return <button
     type="button"
     key={`slot-${slot}`}
     className={`album-side side-${slot}`}
     style={{'--side-stagger':`${slot*65}ms`} as CSSProperties}
     onClick={()=>focusSlide(index,1)}
     aria-label={`Chọn khoảnh khắc ${index+1}`}
    >
     {slotLayers.map(photoIdx=>{
      const isCurrent=photoIdx===index;
      const layerClass=isCurrent
       ?(hasPrev?'album-side-layer is-entering':'album-side-layer is-settled')
       :'album-side-layer is-leaving';
      return <span key={photoIdx} className={layerClass}>
       <img
        src={albumThumbUrl(urls[photoIdx])}
        alt={isCurrent?`Khoảnh khắc ${photoIdx+1}`:''}
        aria-hidden={isCurrent?undefined:true}
        loading="lazy"
        decoding="async"
        onError={e=>handleAlbumImgError(e,urls[photoIdx],photoIdx)}
       />
      </span>;
     })}
     <span className="album-thumb-index" aria-hidden="true">{pad(index+1)}</span>
    </button>;
   })}
  </div>

  {urls.length>1&&<div className="album-controls">
   <button type="button" className="album-arrow" onClick={()=>stepFeatured(-1)} aria-label="Ảnh chính trước">←</button>
   <div ref={stageStripRef} className="album-stage-strip" role="group" aria-label="Dải ảnh trình chiếu nhanh">
    {stageStrip.map(i=><button
     type="button"
     key={i}
     data-active={i===selected?'true':undefined}
     className={`album-stage-strip-btn${i===selected?' is-selected':''}`}
     aria-pressed={i===selected}
     onClick={()=>focusSlide(i)}
     aria-label={`Chuyển đến ảnh ${i+1}`}
    >
     <img src={albumThumbUrl(urls[i])} alt="" loading="lazy" decoding="async" onError={e=>handleAlbumImgError(e,urls[i],i)}/>
    </button>)}
   </div>
   <span className="album-counter-pill" role="status" aria-live="polite">{pad(selected+1)} / {pad(urls.length)}</span>
   <button type="button" className="album-arrow" onClick={()=>stepFeatured(1)} aria-label="Ảnh chính tiếp theo">→</button>
  </div>}

  {urls.length>5&&<div className="album-collection" aria-label="Tất cả ảnh trong album">
   <div className="album-collection-head">
    <h3>Toàn bộ bộ sưu tập</h3>
    <span>Trang {safePage+1} / {totalPages} · {urls.length} ảnh</span>
   </div>
   <div key={`grid-page-${safePage}`} className="album-thumb-grid">
    {gridIndices.map((index,pos)=><button
     type="button"
     key={index}
     style={{'--thumb-order':Math.min(pos,12)} as CSSProperties}
     className={`album-thumb-btn${index===selected?' is-featured':''}`}
     onClick={event=>open(index,event.currentTarget)}
     aria-haspopup="dialog"
     aria-label={`Mở ảnh ${index+1} trong album`}
    >
     <img src={albumThumbUrl(urls[index])} alt={`Ảnh ${index+1}`} loading="lazy" decoding="async" onError={e=>handleAlbumImgError(e,urls[index],index)}/>
     <span className="album-thumb-index" aria-hidden="true">{pad(index+1)}</span>
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
  {lightbox!==null&&<AlbumLightbox urls={urls} initial={lightbox} opener={opener.current} onSync={idx=>goTo(idx)} onClose={()=>setLightbox(null)}/>}
 </section>;
}

function AlbumLightbox({urls,initial,opener,onSync,onClose}:{urls:string[];initial:number;opener:HTMLButtonElement|null;onSync:(index:number)=>void;onClose:()=>void}){
 const ownerDocument=opener?.ownerDocument??document;
 const dialog=useRef<HTMLDialogElement>(null),closeButton=useRef<HTMLButtonElement>(null),touchStartRef=useRef<{x:number;y:number}|null>(null);
 const stripRef=useRef<HTMLDivElement>(null);
 const [failedIndex,setFailedIndex]=useState<number|null>(null),[zoomed,setZoomed]=useState(false);
 const {state,index,select,step}=useLightboxStage(urls,initial);
 const strip=lightboxFilmstrip(index,urls.length,Math.min(urls.length,15));
 const syncRef=useRef(onSync);
 syncRef.current=onSync;
 useFilmstripCenter(stripRef,index);

 useEffect(()=>{
  syncRef.current(index);
 },[index]);

 useEffect(()=>{
  const node=dialog.current;if(!node)return;
  // Native modal dialog supplies focus containment and makes the rest of the document inert.
  node.showModal();closeButton.current?.focus();
  const overflow=ownerDocument.body.style.overflow;ownerDocument.body.style.overflow='hidden';
  return()=>{node.close();ownerDocument.body.style.overflow=overflow;if(opener?.isConnected)opener.focus();};
 },[opener,ownerDocument]);

 const hasPrevLayer=state.prev!==null&&state.prev!==index&&!zoomed&&failedIndex!==state.prev&&Boolean(urls[state.prev]);
 const lbLayers=hasPrevLayer&&state.prev!==null?(state.prev<index?[state.prev,index]:[index,state.prev]):[index];

 return createPortal(<dialog ref={dialog} className="lightbox album-lightbox" aria-label="Xem ảnh album" aria-modal="true"
  onCancel={event=>{event.preventDefault();onClose();}}
  onClick={event=>{if(event.target===event.currentTarget)onClose();}}
  onTouchStart={event=>{
   const t=event.touches[0];
   touchStartRef.current=t?{x:t.clientX,y:t.clientY}:null;
  }}
  onTouchEnd={event=>{
   const start=touchStartRef.current;
   touchStartRef.current=null;
   if(!start||urls.length<2||zoomed)return;
   const end=event.changedTouches[0];
   if(!end)return;
   const dx=end.clientX-start.x;
   const dy=end.clientY-start.y;
   if(Math.abs(dx)>44&&Math.abs(dx)>Math.abs(dy)*1.15){
    setFailedIndex(null);
    setZoomed(false);
    step(dx>0?-1:1);
   }
  }}
  onKeyDown={event=>{
   if(event.key==='Tab'){
    const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const first=buttons[0],last=buttons[buttons.length-1],focused=ownerDocument.activeElement;
    if(event.shiftKey&&focused===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&focused===last){event.preventDefault();first?.focus();}
   }
   if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();setFailedIndex(null);setZoomed(false);step(event.key==='ArrowLeft'?-1:1);}
  }}>
  <div className="lightbox-top-tools">
   <button type="button" className="lightbox-zoom-btn" aria-pressed={zoomed} onClick={()=>setZoomed(z=>!z)} aria-label={zoomed?'Thu nhỏ ảnh về mặc định':'Phóng to chi tiết ảnh'}>
    {zoomed?<ZoomOut size={18} aria-hidden="true"/>:<ZoomIn size={18} aria-hidden="true"/>}
    <span>{zoomed?'Thu chuẩn':'Phóng to'}</span>
   </button>
   <button ref={closeButton} type="button" className="lightbox-close" onClick={onClose} aria-label="Đóng ảnh album">×</button>
  </div>
  {urls.length>1&&<button type="button" className="lightbox-nav previous" onClick={()=>{setFailedIndex(null);setZoomed(false);step(-1);}} aria-label="Ảnh trước">←</button>}
  <figure className={zoomed?'is-zoomed':''}>
   {failedIndex===index
    ?<div className="lightbox-error" role="alert"><p>Chưa tải được ảnh gốc này.</p><button type="button" className="secondary" onClick={()=>setFailedIndex(null)}>Thử tải lại</button></div>
    :<div className="lightbox-stage">
     {lbLayers.map(photoIdx=>{
      const isCurrent=photoIdx===index;
      const imgClass=isCurrent
       ?(state.seq>0&&!zoomed?(state.direction<0?'lightbox-img-current enter-prev':'lightbox-img-current enter-next'):'lightbox-img-current')
       :(state.direction<0?'lightbox-img-prev leave-prev':'lightbox-img-prev leave-next');
      return <img
       key={photoIdx}
       className={imgClass}
       src={urls[photoIdx]}
       alt={isCurrent?`Khoảnh khắc ${photoIdx+1} trong album`:''}
       aria-hidden={isCurrent?undefined:true}
       decoding="async"
       onDoubleClick={isCurrent?()=>setZoomed(z=>!z):undefined}
       onError={isCurrent?e=>{
        const img=e.currentTarget;
        if(img.dataset.fallbackApplied!=='1'){
         img.dataset.fallbackApplied='1';
         img.src=fallbackAlbumUrl(photoIdx);
        }else{
         setFailedIndex(photoIdx);
        }
       }:undefined}
      />;
     })}
    </div>}
   <figcaption role="status" aria-live="polite">Ảnh {index+1} / {urls.length}</figcaption>
   {urls.length>1&&<div ref={stripRef} className="lightbox-filmstrip" aria-label="Chọn nhanh ảnh">
    {strip.map(i=><button type="button" key={i} data-active={i===index?'true':undefined} className={i===index?'lightbox-strip-btn is-active':'lightbox-strip-btn'} onClick={()=>{setFailedIndex(null);setZoomed(false);select(i);}} aria-label={`Chuyển tới ảnh ${i+1}`}>
     <img src={albumThumbUrl(urls[i])} alt="" loading="lazy" decoding="async" onError={e=>handleAlbumImgError(e,urls[i],i)}/>
    </button>)}
   </div>}
  </figure>
  {urls.length>1&&<button type="button" className="lightbox-nav next" onClick={()=>{setFailedIndex(null);setZoomed(false);step(1);}} aria-label="Ảnh tiếp theo">→</button>}
 </dialog>,ownerDocument.body);
}
