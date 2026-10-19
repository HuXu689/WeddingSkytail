'use client';
import {createPortal} from 'react-dom';
import {useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';

/** Live draft, without tokens, persistent storage or guest API calls. */
export function PreviewWindow({children,onClose,popup}:{children:ReactNode;onClose:()=>void;popup:Window}){
 const [target,setTarget]=useState<HTMLElement|null>(null),[error,setError]=useState('');
 const closing=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{
  if(popup.closed){setError('Cửa sổ xem trước đã đóng. Hãy mở lại từ thanh công cụ.');return;}
  const doc=popup.document;doc.title='Xem trước bản nháp — không phát hành';doc.documentElement.lang='vi';
  doc.body.replaceChildren();
  for(const style of document.querySelectorAll('link[rel="stylesheet"],style'))doc.head.appendChild(style.cloneNode(true));
  const viewport=doc.createElement('meta');viewport.name='viewport';viewport.content='width=device-width, initial-scale=1';doc.head.appendChild(viewport);
  const host=doc.createElement('main');host.className='preview-window';doc.body.appendChild(host);setTarget(host);
  popup.addEventListener('pagehide',onClose);
  // Some browsers do not dispatch pagehide for an about:blank popup closed by its title bar.
  const closed=window.setInterval(()=>{if(popup.closed)onClose();},500);
  return()=>{window.clearInterval(closed);popup.removeEventListener('pagehide',onClose);host.remove();};
 },[onClose,popup]);
 useEffect(()=>{if(closing.current!==null)clearTimeout(closing.current);return()=>{closing.current=setTimeout(()=>{if(!popup.closed)popup.close();},0);};},[popup]);
 return <>{error&&<p role="alert" className="error">{error}</p>}{target&&createPortal(children,target)}</>;
}