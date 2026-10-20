'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {api} from '@/shared/api';
import {oneLine,text} from '@/shared/text';
import type {GiftView,WishFeedScope} from '@/shared/invitation-features';

export function giftPath(scope:WishFeedScope){return scope.kind==='public'?`/public/weddings/${encodeURIComponent(scope.slug)}/gifts`:`/guest/invitations/${encodeURIComponent(scope.invitationId)}/gifts`;}
export function GiftBox({scope}:{scope:WishFeedScope}){
 const path=giftPath(scope);return <ScopedGiftBox key={path} path={path}/>;
}
function ScopedGiftBox({path}:{path:string}){
 const [view,setView]=useState<GiftView|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0),[opened,setOpened]=useState(false);
 const opener=useRef<HTMLButtonElement>(null);
 useEffect(()=>{let active=true;setError(false);api<GiftView>(path).then(value=>{if(active)setView(value);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[path,retry]);
 if(error)return <p className="gift-unavailable">Chưa tải được thông tin quà mừng. <button type="button" className="secondary" onClick={()=>setRetry(value=>value+1)}>Thử lại</button></p>;
 if(!view?.enabled||!view.recipients.length||view.recipients.some(item=>!item.assetId||!item.label.trim()))return null;
 return <section className="gift-box"><p className="eyebrow">Một chút yêu thương</p><h2>Quà mừng ngày chung đôi</h2><p>Sự hiện diện và lời chúc của bạn đã là món quà quý giá.</p>
  <button ref={opener} type="button" className="gift-trigger" aria-haspopup="dialog" onClick={()=>setOpened(true)}><span className="gift-symbol" aria-hidden="true">◇</span>Mở hộp quà</button>
  {opened&&<GiftDialog path={path} opener={opener.current} onClose={()=>setOpened(false)}/>}
 </section>;
}
function GiftDialog({path,opener,onClose}:{path:string;opener:HTMLButtonElement|null;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),close=useRef<HTMLButtonElement>(null),downloading=useRef(false),alive=useRef(true);
 const [view,setView]=useState<GiftView|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[selected,setSelected]=useState(0),[imageError,setImageError]=useState(false),[imageReady,setImageReady]=useState(false),[busy,setBusy]=useState(false),[downloadError,setDownloadError]=useState('');
 const title=useId(),description=useId(),ownerDocument=opener?.ownerDocument??document;
 useEffect(()=>{
  alive.current=true;const node=dialog.current;node?.showModal();close.current?.focus();
  if(node&&opener)node.style.setProperty('--wedding-accent',getComputedStyle(opener).getPropertyValue('--wedding-accent'));
  const overflow=ownerDocument.body.style.overflow;ownerDocument.body.style.overflow='hidden';
  return()=>{alive.current=false;node?.close();ownerDocument.body.style.overflow=overflow;if(opener?.isConnected)opener.focus({preventScroll:true});};
 },[opener,ownerDocument]);
 useEffect(()=>{let active=true;setView(null);setError('');setImageReady(false);setImageError(false);setDownloadError('');api<GiftView>(path).then(value=>{if(active){setView(value);setSelected(0);}}).catch(()=>{if(active)setError('Không tải được hộp quà. Vui lòng thử lại hoặc đóng để quay về thiệp.');});return()=>{active=false;};},[path,retry]);
 const recipient=view?.recipients[selected],url=recipient?.assetId?`/api/v1${path}/assets/${encodeURIComponent(recipient.assetId)}`:null;
 const available=view?.enabled&&view.recipients.length>0&&view.recipients.every(item=>item.assetId&&item.label.trim());
 function choose(index:number){if(index===selected)return;setSelected(index);setImageError(false);setImageReady(false);setDownloadError('');}
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
 return createPortal(<dialog ref={dialog} className="gift-dialog" aria-labelledby={title} aria-describedby={description}
  onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget){const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)onClose();}}}>
  <div className="gift-dialog-content"><button ref={close} type="button" className="secondary gift-close" onClick={onClose} aria-label="Đóng hộp quà">Đóng ×</button><h2 id={title}>Hộp quà mừng</h2><p id={description}>Nếu bạn muốn gửi quà, hãy kiểm tra đúng tên người nhận trong ứng dụng ngân hàng trước khi chuyển.</p>
  {!view&&!error&&<p role="status">Đang mở hộp quà…</p>}
  {error&&<div role="alert"><p>{error}</p><button type="button" className="secondary" onClick={()=>setRetry(value=>value+1)}>Thử tải lại hộp quà</button></div>}
  {view&&!available&&<p role="status">Hộp quà hiện không khả dụng. Bạn vẫn có thể gửi lời chúc tới hai bạn.</p>}
  {available&&recipient&&url&&<>
   {view.recipients.length>1&&<div className="gift-options" role="group" aria-label="Chọn người nhận">{view.recipients.map((item,index)=><button type="button" className="secondary" key={item.assetId??index} aria-pressed={selected===index} onClick={()=>choose(index)} disabled={busy}>{oneLine(item.label)}</button>)}</div>}
   <h3>{oneLine(recipient.label)}</h3>{recipient.description&&<p className="gift-description">{text(recipient.description)}</p>}
   <img key={`${url}-${retry}`} className="gift-qr" src={url} alt={`Mã QR quà mừng — ${oneLine(recipient.label)}`} width={280} height={280} onLoad={()=>{setImageReady(true);setImageError(false);}} onError={()=>{setImageError(true);setImageReady(false);}}/>
   {imageError&&<p role="alert">Chưa tải được ảnh QR. <button type="button" className="secondary" onClick={()=>{setImageError(false);setImageReady(false);setRetry(value=>value+1);}}>Thử tải lại ảnh</button></p>}
   <div className="row"><button type="button" disabled={busy||!imageReady||imageError} onClick={()=>void download()}>{busy?'Đang tải…':'Tải ảnh QR'}</button><a className="button secondary" href={url} target="_blank" rel="noreferrer">Mở ảnh gốc ↗</a></div>
   {downloadError&&<p role="alert">{downloadError}</p>}
   <p className="field-hint">Ảnh tải về giữ nguyên PNG. Việc mở hoặc tải mã không phải là chuyển tiền hay xác nhận đã nhận quà.</p>
  </>}
  </div>
 </dialog>,ownerDocument.body);
}