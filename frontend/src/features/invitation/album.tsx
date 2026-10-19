'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {imageIndex,secondaryImages} from './album-window';

export function WeddingAlbum({urls}:{urls:string[]}){
 const [active,setActive]=useState(0),[lightbox,setLightbox]=useState<number|null>(null);
 const opener=useRef<HTMLButtonElement|null>(null);
 const selected=imageIndex(active,urls.length);
 function open(index:number,button:HTMLButtonElement){opener.current=button;setLightbox(index);}
 if(!urls.length)return null;
 return <section className="wedding-album reveal">
  <div className="album-heading"><div><p className="eyebrow">Những khoảnh khắc</p><h2>Album yêu thương</h2></div><span>{urls.length} ảnh</span></div>
  <div className={`album-editorial album-gallery count-${Math.min(urls.length,5)}`}>
   <button type="button" className="album-main" onClick={event=>open(selected,event.currentTarget)} aria-haspopup="dialog" aria-label={`Xem ảnh ${selected+1} kích thước lớn`}><img src={urls[selected]} alt={`Khoảnh khắc ${selected+1} trong album`} loading="lazy" decoding="async"/></button>
   {secondaryImages(selected,urls.length).map((index,slot)=><button type="button" key={slot} className={`album-side side-${slot}`} onClick={event=>open(index,event.currentTarget)} aria-haspopup="dialog" aria-label={`Mở ảnh ${index+1}`}><img src={urls[index]} alt={`Khoảnh khắc ${index+1}`} loading="lazy" decoding="async"/></button>)}
  </div>
  {urls.length>1&&<div className="album-controls"><button type="button" className="album-arrow" onClick={()=>setActive(imageIndex(selected-1,urls.length))} aria-label="Ảnh chính trước">←</button><span role="status" aria-live="polite">Ảnh {selected+1} / {urls.length}</span><button type="button" className="album-arrow" onClick={()=>setActive(imageIndex(selected+1,urls.length))} aria-label="Ảnh chính tiếp theo">→</button></div>}
  {lightbox!==null&&<AlbumLightbox urls={urls} initial={lightbox} opener={opener.current} onClose={()=>setLightbox(null)}/>}
 </section>;
}

function AlbumLightbox({urls,initial,opener,onClose}:{urls:string[];initial:number;opener:HTMLButtonElement|null;onClose:()=>void}){
 const ownerDocument=opener?.ownerDocument??document;
 const dialog=useRef<HTMLDialogElement>(null),closeButton=useRef<HTMLButtonElement>(null);
 const [active,setActive]=useState(initial);
 const index=imageIndex(active,urls.length);
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
  <figure><img src={urls[index]} alt={`Khoảnh khắc ${index+1} trong album`} decoding="async"/><figcaption role="status" aria-live="polite">Ảnh {index+1} / {urls.length}</figcaption></figure>
  {urls.length>1&&<button type="button" className="lightbox-nav next" onClick={()=>setActive(imageIndex(index+1,urls.length))} aria-label="Ảnh tiếp theo">→</button>}
 </dialog>,ownerDocument.body);
}