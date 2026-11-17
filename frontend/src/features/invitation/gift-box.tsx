'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {api} from '@/shared/api';
import {oneLine,text} from '@/shared/text';
import type {GiftView,WishFeedScope} from '@/shared/invitation-features';
import {SectionCornerStickers,StickerBadge,WeddingSticker} from './wedding-stickers';

export function giftPath(scope:WishFeedScope){return scope.kind==='public'?`/public/weddings/${encodeURIComponent(scope.slug)}/gifts`:`/guest/invitations/${encodeURIComponent(scope.invitationId)}/gifts`;}

export function GiftKeepsakeEmblem(){
 return <svg className="gift-keepsake-svg" viewBox="0 0 210 140" fill="none" aria-hidden="true">
  <defs>
   <linearGradient id="giftCardPaper" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stopColor="#fffef9"/>
    <stop offset="55%" stopColor="#faf2e2"/>
    <stop offset="100%" stopColor="#f2e2c6"/>
   </linearGradient>
   <linearGradient id="giftCardGold" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stopColor="#f4e0a3"/>
    <stop offset="50%" stopColor="#c79b44"/>
    <stop offset="100%" stopColor="#8d671f"/>
   </linearGradient>
  </defs>
  <rect x="26" y="28" width="158" height="94" rx="14" fill="url(#giftCardPaper)" stroke="url(#giftCardGold)" strokeWidth="1.8"/>
  <rect x="33" y="35" width="144" height="80" rx="10" stroke="url(#giftCardGold)" strokeWidth="0.85" strokeDasharray="3.5 3.5" opacity="0.78"/>
  <path d="M29 33 L105 82 L181 33" stroke="url(#giftCardGold)" strokeWidth="1.5" fill="none"/>
  <path d="M31 116 L85 71 M179 116 L125 71" stroke="url(#giftCardGold)" strokeWidth="1.1" opacity="0.52"/>
  <path d="M62 28 C78 16, 132 16, 148 28" stroke="url(#giftCardGold)" strokeWidth="1.2" strokeLinecap="round" opacity="0.75"/>
  <circle cx="105" cy="76" r="20" fill="currentColor" stroke="url(#giftCardGold)" strokeWidth="2"/>
  <circle cx="105" cy="76" r="15" stroke="url(#giftCardGold)" strokeWidth="0.95" strokeDasharray="2.2 2.2"/>
  <path d="M105 84 L96.5 75.5 C92.5 70.5 98.8 64.5 105 70 C111.2 64.5 117.5 70.5 113.5 75.5 Z" fill="#faecc2"/>
  <path d="M105 8 L107.2 14 L113.2 16.2 L107.2 18.4 L105 24.4 L102.8 18.4 L96.8 16.2 L102.8 14 Z" fill="url(#giftCardGold)"/>
  <circle cx="48" cy="18" r="2.2" fill="url(#giftCardGold)" opacity="0.75"/>
  <circle cx="162" cy="18" r="2.2" fill="url(#giftCardGold)" opacity="0.75"/>
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

function ExternalIcon(){
 return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
  <polyline points="15 3 21 3 21 9"/>
  <line x1="10" y1="14" x2="21" y2="3"/>
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
   <div className="gift-box-divider" aria-hidden="true"><span>✦</span></div>
   <p className="gift-box-lead">Sự hiện diện và những lời chúc phúc tốt đẹp của bạn chính là món quà quý giá nhất đối với chúng mình.</p>
   {view.recipients.length>0&&<p className="gift-box-recipients-hint">{view.recipients.length>1?`Gồm ${view.recipients.length} mã mừng riêng biệt`:`Dành tặng ${oneLine(view.recipients[0].label)}`}</p>}
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
  if(node&&opener){
   node.style.setProperty('--wedding-accent',getComputedStyle(opener).getPropertyValue('--wedding-accent'));
   const canvas=opener.closest('.wedding-canvas');
   if(canvas){for(const cls of ['theme-traditional','theme-modern','theme-elegant']){if(canvas.classList.contains(cls))node.classList.add(cls);}}
  }
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
   <div className="gift-dialog-card-frame">
    <SectionCornerStickers compact/>
    <header className="gift-dialog-header">
     <div className="gift-dialog-seal" aria-hidden="true">
      <WeddingSticker kind="wax-seal-song-hy" size={44}/>
     </div>
     <div className="gift-dialog-titlewrap">
      <span className="gift-dialog-badge">Thiệp mừng cưới</span>
      <h2 id={title}>Hộp quà mừng</h2>
     </div>
     <button ref={close} type="button" className="secondary gift-close" onClick={onClose} aria-label="Đóng hộp quà">Đóng ×</button>
    </header>
    <p id={description} className="gift-dialog-intro">Nếu bạn muốn gửi quà, hãy kiểm tra đúng tên người nhận trong ứng dụng ngân hàng trước khi chuyển.</p>
    <div className="gift-dialog-ornament-rule" aria-hidden="true"><span>✦</span></div>
    {!view&&!error&&<p className="gift-loading" role="status">Đang mở hộp quà…</p>}
    {error&&<div className="gift-error-box" role="alert"><p>{error}</p><button type="button" className="secondary" onClick={()=>setRetry(value=>value+1)}>Thử tải lại hộp quà</button></div>}
    {view&&!available&&<p role="status">Hộp quà hiện không khả dụng. Bạn vẫn có thể gửi lời chúc tới hai bạn.</p>}
    {available&&recipient&&url&&<div className="gift-qr-card">
     {view.recipients.length>1&&<div className="gift-options" role="group" aria-label="Chọn người nhận">{view.recipients.map((item,index)=><button type="button" className="secondary" key={item.assetId??index} aria-pressed={selected===index} onClick={()=>choose(index)} disabled={busy}>{oneLine(item.label)}</button>)}</div>}
     <div className="gift-recipient-meta">
      <span className="gift-recipient-kicker">Người nhận quà mừng</span>
      <h3>{oneLine(recipient.label)}</h3>
      {recipient.description?.trim()&&<div className="gift-recipient-note">
       <p className="gift-description">{text(recipient.description)}</p>
       <button type="button" className="secondary gift-copy-info-btn" onClick={async()=>{try{await navigator.clipboard.writeText(text(recipient.description));if(alive.current)setCopyNotice('Đã sao chép thông tin tài khoản vào bộ nhớ tạm.');}catch{if(alive.current)setCopyNotice('Trình duyệt chưa hỗ trợ sao chép tự động. Vui lòng chọn chữ để sao chép.');}}}><CopyIcon/><span>Sao chép thông tin</span></button>
      </div>}
     </div>
     <div className="gift-qr-stage">
      <div className="gift-qr-pedestal">
       {!imageReady&&!imageError&&<p className="gift-qr-loading" role="status">Đang tải mã QR…</p>}
       <img key={`${url}-${retry}`} className="gift-qr" src={url} alt={`Mã QR quà mừng — ${oneLine(recipient.label)}`} width={280} height={280} onLoad={()=>{setImageReady(true);setImageError(false);}} onError={()=>{setImageError(true);setImageReady(false);}}/>
      </div>
      <p className="gift-qr-caption">Mở ứng dụng ngân hàng hoặc ví điện tử để quét mã</p>
     </div>
     {imageError&&<p className="gift-error-box" role="alert">Chưa tải được ảnh QR. <button type="button" className="secondary" onClick={()=>{setImageError(false);setImageReady(false);setRetry(value=>value+1);}}>Thử tải lại ảnh</button></p>}
     <div className="row gift-actions">
      <button type="button" className="gift-primary-btn" disabled={busy||!imageReady||imageError} onClick={()=>void download()}><DownloadIcon/><span>{busy?'Đang tải…':'Tải ảnh QR'}</span></button>
      <button type="button" className="secondary" disabled={busy||!imageReady||imageError} onClick={()=>void copy()}><CopyIcon/><span>Sao chép ảnh QR</span></button>
      <a className="button secondary" href={url} target="_blank" rel="noreferrer"><ExternalIcon/><span>Mở ảnh gốc ↗</span></a>
     </div>
     {copyNotice&&<p className="field-hint gift-feedback" role="status">{copyNotice}</p>}
     {downloadError&&<p className="gift-error-box" role="alert">{downloadError}</p>}
     <p className="field-hint gift-disclaimer">Ảnh tải về giữ nguyên PNG. Việc mở hoặc tải mã không phải là chuyển tiền hay xác nhận đã nhận quà.</p>
    </div>}
   </div>
  </div>
 </dialog>,ownerDocument.body);
}
