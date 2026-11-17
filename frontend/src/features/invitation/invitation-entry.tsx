'use client';
import {useEffect,useRef,useState} from 'react';
import {api,ApiError} from '@/shared/api';
import {createOpenIntent} from './open-intent';
import {INVITATION_UNAVAILABLE as unavailable} from './access-copy';
import {WeddingIllustration} from './wedding-illustration';
import {SectionCornerStickers,StickerBadge,WeddingSticker} from './wedding-stickers';

const openInvitation=createOpenIntent<unknown>(api);

/** The envelope contains only generic copy: no recipient, design or event before authorization. */
export function InvitationEntry<T>({id,onOpened}:{id:string;onOpened:(data:T)=>void}){
 const [phase,setPhase]=useState<'loading'|'sealed'|'opening'|'pin'|'error'>('loading');
 const [error,setError]=useState(''),[pin,setPin]=useState(''),[busy,setBusy]=useState(false);
 const [decoration,setDecoration]=useState(false),[visible,setVisible]=useState(true);
 useEffect(()=>{const update=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 const locked=useRef(false),generation=useRef(0),heading=useRef<HTMLHeadingElement>(null);
 const deliver=useRef(onOpened);deliver.current=onOpened;
 useEffect(()=>{
  const current=++generation.current;let active=true;
  setPhase('loading');setError('');setPin('');locked.current=true;
  async function restore(){
   try{
    const path=`/guest/invitations/${id}`;
    const state=await api<{opened:boolean}>(`${path}/state`);
    // Reduced motion skips the visual transition, not consent or the access gate.
    if(state.opened){const data=await api<T>(path);if(active)deliver.current(data);}
    else if(active)setPhase('sealed');
   }catch(e){if(active){setPhase(e instanceof ApiError&&e.status===428?'pin':'error');if(!(e instanceof ApiError&&e.status===428))setError(unavailable);}}
   finally{if(active&&generation.current===current)locked.current=false;}
  }
  void restore();return()=>{active=false;generation.current++;};
 },[id]);
 useEffect(()=>{if(phase==='pin'||phase==='error')heading.current?.focus();},[phase]);

 async function open(){
  if(locked.current)return;
  locked.current=true;const current=generation.current;
  const needsPin=phase==='pin';setBusy(true);setError('');
  try{
   if(needsPin){await api(`/guest/invitations/${id}/pin`,'POST',{pin});if(current!==generation.current)return;setPin('');}
   setPhase('opening');
   const data=await openInvitation(id) as T;
   if(current===generation.current)deliver.current(data);
  }catch(e){
   if(current!==generation.current)return;
   const pinFailure=e instanceof ApiError&&e.status===428;
   setPhase(pinFailure||needsPin?'pin':'error');
   if(!pinFailure)setError(needsPin&&e instanceof ApiError&&e.status===403?'Mã PIN không đúng. Vui lòng kiểm tra lại.':needsPin&&e instanceof ApiError&&(e.status===422||e.status===429)?e.message:unavailable);
  }finally{if(current===generation.current){locked.current=false;setBusy(false);}}
 }
 return <section className="hero invitation-entry" aria-busy={phase==='loading'||busy}>
  <SectionCornerStickers compact/>
  <div className="entry-floating-stickers" aria-hidden="true">
   <WeddingSticker kind="royal-crest" size={92}/>
  </div>
  <StickerBadge sticker="wax-seal-song-hy" label="Thiệp hồng kính mời"/>
  <div className={`invitation-envelope ${phase==='opening'?'is-opening':''}`} aria-hidden="true"><span className="envelope-letter"><WeddingIllustration kind="heart"/></span><span className="envelope-flap"/><span className="envelope-seal">♡</span></div>
  <p className="eyebrow">{phase==='pin'?'Bảo vệ bằng mã PIN':'Một lời mời dành cho bạn'}</p>
  <h1 ref={heading} tabIndex={-1}>{phase==='pin'?'Nhập mã PIN để mở thiệp':<>Hẹn gặp bạn<br/>ngày chung đôi.</>}</h1>
  <p>Website ghi nhận thời điểm mở thiệp để người gửi theo dõi lời mời; không công khai lịch sử của bạn.</p>
  <button type="button" className="secondary intro-decoration-toggle" aria-pressed={decoration} onClick={()=>setDecoration(value=>!value)}>{decoration?'Tắt trang trí chuyển động':'Bật trang trí chuyển động'}</button>
  {decoration&&<div className={`intro-decoration ${visible?'':'is-paused'}`} aria-hidden="true"><span>♡</span><span>❧</span><span>♡</span></div>}
  {phase==='pin'?<form className="pin-form" onSubmit={e=>{e.preventDefault();void open();}}>
   <p>Mã PIN do người gửi đặt riêng cho bạn, thường được gửi qua tin nhắn riêng. Mã không nằm trên thiệp hay mã QR.</p>
   <label>Mã PIN<input type="password" inputMode="numeric" autoComplete="one-time-code" maxLength={12} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,12))} required disabled={busy}/></label>
   <button disabled={busy||pin.length<4}>{busy?'Đang kiểm tra…':'Mở thiệp'}</button>
  </form>:<button disabled={phase==='loading'||busy} onClick={()=>void open()}>{phase==='loading'?'Đang kiểm tra thiệp…':busy?'Đang mở thiệp…':phase==='error'?'Thử mở lại thiệp':'Mở thiệp'} <span aria-hidden="true">♡</span></button>}
  <p className="sr-only" role="status">{phase==='opening'?'Đang mở thiệp. Vui lòng chờ.':''}</p>
  {error&&<p role="alert" className="error">{error}</p>}
 </section>;
}
