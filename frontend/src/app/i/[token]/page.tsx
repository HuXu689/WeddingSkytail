'use client';
import {use,useState} from 'react';
import {MailOpen,Sparkles} from 'lucide-react';
import {api} from '@/shared/api';
import {WeddingIllustration} from '@/features/invitation/wedding-illustration';
import {SectionCornerStickers,StickerBadge,WeddingSticker} from '@/features/invitation/wedding-stickers';

export default function Entry({params}:{params:Promise<{token:string}>}) {
 const {token}=use(params);const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <main className="welcome-shell invitation-gate">
  <section className="hero invitation-entry token-bridge-card" aria-busy={busy}>
   <SectionCornerStickers compact/>
   <div className="entry-floating-stickers" aria-hidden="true">
    <WeddingSticker kind="royal-crest" size={92}/>
   </div>
   <StickerBadge sticker="wax-seal-song-hy" label="Thiệp mời riêng"/>
   <div className={`invitation-envelope ${busy?'is-opening':''}`} aria-hidden="true">
    <span className="envelope-letter"><WeddingIllustration kind="heart"/></span>
    <span className="envelope-flap"/>
    <span className="envelope-seal">♡</span>
   </div>
   <p className="eyebrow">Trân trọng kính mời</p>
   <h1>Một phong thư<br/>gửi riêng đến bạn.</h1>
   <p className="token-bridge-lead">Bấm bên dưới để xác thực liên kết cá nhân và mở thiệp cưới dành riêng cho bạn.</p>
   {error&&<p className="error" role="alert">{error}</p>}
   <button className="invitation-seal-cta" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const data=await api<{invitationId:string}>('/guest-links/redeem','POST',{token});window.location.replace(`/invitation/${data.invitationId}`);}catch{setError('Thiệp chưa mở hoặc hiện không khả dụng. Vui lòng thử lại sau hoặc liên hệ người gửi.');setBusy(false);}}}>
    <MailOpen size={17} aria-hidden="true"/>
    <span>{busy?'Đang mở phong thư…':'Mở phong thư mời'}</span>
    <Sparkles size={15} aria-hidden="true"/>
   </button>
   <p className="field-hint token-bridge-note">Liên kết cá nhân chứa thông tin buổi tiệc và phần xác nhận tham dự riêng của bạn.</p>
  </section>
 </main>;
}