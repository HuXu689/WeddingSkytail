'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {api} from '@/shared/api';
import {oneLine,text} from '@/shared/text';
import type {GiftView,WishFeedScope} from '@/shared/invitation-features';
import {SectionCornerStickers,StickerBadge} from './wedding-stickers';

export function giftPath(scope:WishFeedScope){return scope.kind==='public'?`/public/weddings/${encodeURIComponent(scope.slug)}/gifts`:`/guest/invitations/${encodeURIComponent(scope.invitationId)}/gifts`;}

function GiftKeepsakeEmblem(){
 return <svg className="gift-keepsake-svg" viewBox="0 0 180 128" fill="none" aria-hidden="true">
  <defs>
   <linearGradient id="giftCardPaper" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stopColor="#fffdf9"/>
    <stop offset="100%" stopColor="#f5ecda"/>
   </linearGradient>
   <linearGradient id="giftCardGold" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stopColor="#f3dfa2"/>
    <stop offset="50%" stopColor="#c59c4a"/>
    <stop offset="100%" stopColor="#8f6b23"/>
   </linearGradient>
  </defs>
  <rect x="22" y="26" width="136" height="84" rx="12" fill="url(#giftCardPaper)" stroke="url(#giftCardGold)" strokeWidth="1.6"/>
  <rect x="28" y="32" width="124" height="72" rx="8" stroke="url(#giftCardGold)" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.7"/>
  <path d="M24 30 L90 74 L156 30" stroke="url(#giftCardGold)" strokeWidth="1.4" fill="none"/>
  <path d="M26 106 L74 64 M154 106 L106 64" stroke="url(#giftCardGold)" strokeWidth="1" opacity="0.55"/>
  <circle cx="90" cy="70" r="18" fill="currentColor" stroke="url(#giftCardGold)" strokeWidth="1.8"/>
  <circle cx="90" cy="70" r="13.5" stroke="url(#giftCardGold)" strokeWidth="0.9" strokeDasharray="2 2"/>
  <path d="M90 77 L82.5 69.5 C79 65 84.5 60 90 65 C95.5 60 101 65 97.5 69.5 Z" fill="#f7e7ba"/>
  <path d="M90 10 L92 15 L97 17 L92 19 L90 24 L88 19 L83 17 L88 15 Z" fill="url(#giftCardGold)"/>
 </svg>;
}

function GiftIcon(){
 return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <rect x="3" y="8" width="18" height="4" rx="1"/>
  <path d="M12 8v13"/>
  <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>
  <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>
 </svg>;
}

function DownloadIcon(){
 return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="7 10 12 15 17 10"/>
  <line x1="12" y1="15" x2="12" y2="3"/>
 </svg>;
}

function CopyIcon(){
 return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <rect x="9" y="9" width="13" height="13" rx="2"/>
  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
 </svg>;
}

export function GiftBox({scope}:{scope:WishFeedScope}){
 const path=giftPath(scope);return <ScopedGiftBox key={path} path={path}/>;
}

function ScopedGiftBox({path}:{path:string}){
 const [view,setView]=useState<GiftView|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0),[opened,setOpened]=useState(false);
 const opener=useRef<HTMLButtonElement>(null);
 useEffect(()=>{let active=true;setError(false);api<GiftView>(path).then(value=>{if(active)setView(value);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[path,retry]);
 if(error)return <p className="gift-unavailable">Chưa tải được thông tin quà mừng. <button type="button" className="secondary" onClick={()=>setRetry(value=>value+1)}>Thử lại</button></p>;
 if(!view?.enabled||!view.recipients.length||view.recipients.some(item=>!item.assetId||!item.label.trim()))return null;
 return <section className="gift-box reveal">
  <SectionCornerStickers compact/>
  <div className="gift-box-inner">
   <StickerBadge sticker="wax-seal-song-hy" label="Hộp quà hồng phúc"/>
   <div className="gift-box-emblem" aria-hidden="true">
    <GiftKeepsakeEmblem/>
   </div>
   <p className="eyebrow">Một chút yêu thương</p>
   <h2>Hộp quà mừng ngày chung đôi</h2>
   <p className="gift-box-lead">Sự hiện diện và những lời chúc phúc tốt đẹp của bạn chính là món quà quý giá nhất đối với chúng mình.</p>
   <button ref={opener} type="button" className="gift-trigger" aria-haspopup="dialog" onClick={()=>{setOpened(true);if(typeof window!=='undefined'){window.dispatchEvent(new CustomEvent('wedding:fireworks'));window.dispatchEvent(new CustomEvent('wedding:hearts'));}}}>
    <span className="gift-symbol" aria-hidden="true"><GiftIcon/></span>
    <span>Mở hộp quà mừng</span>
   </button>
  </div>
  {opened&&<GiftDialog path={path} opener={opener.current} onClose={()=>setOpened(false)}/>}
 </section>;
}

function GiftDialog({path,opener,onClose}:{path:string;opener:HTMLButtonElement|null;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),close=useRef<HTMLButtonElement>(null),downloading=useRef(false),alive=useRef(true),copying=useRef(false);
 const [view,setView]=useState<GiftView|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[selected,setSelected]=useState(0),[imageError,setImageError]=useState(false),[imageReady,setImageReady]=useState(false),[busy,setBusy]=useState(false),[downloadError,setDownloadError]=useState(''),[copyNotice,setCopyNotice]=useState('');
 const title=useId(),description=useId(),ownerDocument=opener?.ownerDocument??document;
 useEffect(()=>{
  alive.current=true;const node=dialog.current;node?.showModal();close.current?.focus();
  if(node&&opener)node.style.setProperty('--wedding-accent',getComputedStyle(opener).getPropertyValue('--wedding-accent'));
  const overflow=ownerDocument.body.style.overflow;ownerDocument.body.style.overflow='hidden';
  return()=>{alive.current=false;node?.close();ownerDocument.body.style.overflow=overflow;if(opener?.isConnected)opener.focus({preventScroll:true});};
 },[opener,ownerDocument]);
 useEffect(()=>{let active=true;setView(null);setError('');setImageReady(false);setImageError(false);setDownloadError('');setCopyNotice('');api<GiftView>(path).then(value=>{if(active){setView(value);setSelected(0);}}).catch(()=>{if(active)setError('Không tải được hộp quà. Vui lòng thử lại hoặc đóng để quay về thiệp.');});return()=>{active=false;};},[path,retry]);
 const recipient=view?.recipients[selected],url=recipient?.assetId?`/api/v1${path}/assets/${encodeURIComponent(recipient.assetId)}`:null;
 const available=view?.enabled&&view.recipients.length>0&&view.recipients.every(item=>item.assetId&&item.label.trim());
 function choose(index:number){if(index===selected)return;setSelected(index);setImageError(false);setImageReady(false);setDownloadError('');setCopyNotice('');}
 async function download(){
  if(!url||downloading.current)return;downloading.current=true;setBusy(true);setDownloadError('');
  try{
   const response=await fetch(url,{credentials:'include',cache:'no-store'});
   if(!response.ok||!response.headers.get('Content-Type')?.startsWith('image/png'))throw Error();
   const blob=await response.blob();if(!alive.current)return;
   const objectUrl=URL.createObjectURL(blob),anchor=ownerDocument.createElement('a');anchor.href=objectUrl;anchor.download='qua-mung.png';ownerDocument.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
  }catch{if(alive.current)setDownloadError('Chưa tải được ảnh. Bạn có thể mở ảnh gốc và lưu bằng trình duyệt.');}
  finally{downloading.current=false;if(alive.current)setBusy(false);}
 }
 async function copy(){
  if(!url||copying.current)return;copying.current=true;setCopyNotice('');
  try{
   const response=await fetch(url,{credentials:'include',cache:'no-store'});
   if(!response.ok||!response.headers.get('Content-Type')?.startsWith('image/png'))throw Error();
   const blob=await response.blob();if(!alive.current)return;
   await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
   if(alive.current)setCopyNotice('Đã sao chép ảnh QR. Bạn có thể dán vào ứng dụng nhắn tin hoặc ghi chú.');
  }catch{if(alive.current)setCopyNotice('Trình duyệt chưa cho phép sao chép ảnh. Bạn có thể tải ảnh hoặc mở ảnh gốc.');}
  finally{copying.current=false;}
 }
 return createPortal(<dialog ref={dialog} className="gift-dialog" aria-labelledby={title} aria-describedby={description}
  onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget){const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)onClose();}}}>
  <div className="gift-dialog-content">
   <header className="gift-dialog-header">
    <div className="gift-dialog-titlewrap">
     <span className="gift-dialog-badge">Thiệp mừng cưới</span>
     <h2 id={title}>Hộp quà mừng</h2>
    </div>
    <button ref={close} type="button" className="secondary gift-close" onClick={onClose} aria-label="Đóng hộp quà">Đóng ×</button>
   </header>
   <p id={description} className="gift-dialog-intro">Nếu bạn muốn gửi quà, hãy kiểm tra đúng tên người nhận trong ứng dụng ngân hàng trước khi chuyển.</p>
   {!view&&!error&&<p className="gift-loading" role="status">Đang mở hộp quà…</p>}
   {error&&<div className="gift-error-box" role="alert"><p>{error}</p><button type="button" className="secondary" onClick={()=>setRetry(value=>value+1)}>Thử tải lại hộp quà</button></div>}
   {view&&!available&&<p role="status">Hộp quà hiện không khả dụng. Bạn vẫn có thể gửi lời chúc tới hai bạn.</p>}
   {available&&recipient&&url&&<div className="gift-qr-card">
    {view.recipients.length>1&&<div className="gift-options" role="group" aria-label="Chọn người nhận">{view.recipients.map((item,index)=><button type="button" className="secondary" key={item.assetId??index} aria-pressed={selected===index} onClick={()=>choose(index)} disabled={busy}>{oneLine(item.label)}</button>)}</div>}
    <div className="gift-recipient-meta">
     <h3>{oneLine(recipient.label)}</h3>
     {recipient.description&&<p className="gift-description">{text(recipient.description)}</p>}
    </div>
    <div className="gift-qr-pedestal">
     {!imageReady&&!imageError&&<p className="gift-qr-loading" role="status">Đang tải mã QR…</p>}
     <img key={`${url}-${retry}`} className="gift-qr" src={url} alt={`Mã QR quà mừng — ${oneLine(recipient.label)}`} width={280} height={280} onLoad={()=>{setImageReady(true);setImageError(false);}} onError={()=>{setImageError(true);setImageReady(false);}}/>
    </div>
    {imageError&&<p className="gift-error-box" role="alert">Chưa tải được ảnh QR. <button type="button" className="secondary" onClick={()=>{setImageError(false);setImageReady(false);setRetry(value=>value+1);}}>Thử tải lại ảnh</button></p>}
    <div className="row gift-actions">
     <button type="button" disabled={busy||!imageReady||imageError} onClick={()=>void download()}><DownloadIcon/><span>{busy?'Đang tải…':'Tải ảnh QR'}</span></button>
     <button type="button" className="secondary" disabled={busy||!imageReady||imageError} onClick={()=>void copy()}><CopyIcon/><span>Sao chép ảnh QR</span></button>
     <a className="button secondary" href={url} target="_blank" rel="noreferrer">Mở ảnh gốc ↗</a>
    </div>
    {copyNotice&&<p className="field-hint gift-feedback" role="status">{copyNotice}</p>}
    {downloadError&&<p className="gift-error-box" role="alert">{downloadError}</p>}
    <p className="field-hint gift-disclaimer">Ảnh tải về giữ nguyên PNG. Việc mở hoặc tải mã không phải là chuyển tiền hay xác nhận đã nhận quà.</p>
   </div>}
  </div>
 </dialog>,ownerDocument.body);
}
