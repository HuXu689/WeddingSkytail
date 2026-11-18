'use client';
import {use,useEffect,useState} from 'react';
import {MailOpen,Sparkles} from 'lucide-react';
import {api} from '@/shared/api';
import {WeddingIllustration} from '@/features/invitation/wedding-illustration';
import {SectionCornerStickers,StickerBadge,WeddingSticker} from '@/features/invitation/wedding-stickers';
import {CelebrationOrnaments} from '@/features/invitation/celebration-ornaments';
import {PetalShower} from '@/features/invitation/petal-shower';
import {GoldenDust} from '@/features/invitation/golden-dust';
import {ButterflyFlight} from '@/features/invitation/butterfly-flight';
import {SparkleTrail} from '@/features/invitation/sparkle-trail';

export default function Entry({params}:{params:Promise<{token:string}>}) {
 const {token}=use(params);const [error,setError]=useState(''),[busy,setBusy]=useState(false),[visible,setVisible]=useState(true);
 useEffect(()=>{const update=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 async function redeemToken(){
  if(busy)return;
  setBusy(true);setError('');
  try{
   const data=await api<{invitationId:string}>('/guest-links/redeem','POST',{token});
   window.location.replace(`/invitation/${data.invitationId}`);
  }catch{
   setError('Thiệp chưa mở hoặc hiện không khả dụng. Vui lòng thử lại sau hoặc liên hệ người gửi.');
   setBusy(false);
  }
 }
 return <main className="welcome-shell invitation-gate">
  <div className="entry-ambient-stage" aria-hidden="true">
   <CelebrationOrnaments/>
   <PetalShower intensity="normal" active={visible}/>
   <GoldenDust count={18} active={visible}/>
   <ButterflyFlight count={2} active={visible}/>
   {visible&&<SparkleTrail/>}
  </div>
  <section className="hero invitation-entry token-bridge-card" aria-busy={busy}>
   <SectionCornerStickers compact/>
   <div className="entry-floating-stickers" aria-hidden="true">
    <WeddingSticker kind="butterfly-gold" size={34} className="entry-crest-wing wing-left"/>
    <WeddingSticker kind="royal-crest" size={92}/>
    <WeddingSticker kind="butterfly-gold" size={34} className="entry-crest-wing wing-right"/>
   </div>
   <StickerBadge sticker="wax-seal-song-hy" label="Thiệp mời riêng"/>
   <div className={`invitation-envelope is-interactive ${busy?'is-opening':''}`} onClick={()=>void redeemToken()} aria-hidden="true">
    <span className="envelope-aura-glow"/>
    <span className="envelope-letter">
     <WeddingIllustration kind="heart"/>
     <small className="envelope-letter-caption">Thiệp Hồng Kính Mời</small>
    </span>
    <span className="envelope-pocket"/>
    <span className="envelope-flap"/>
    <span className="envelope-seal"><span className="entry-seal-pulse"/>囍</span>
   </div>
   <p className="eyebrow">Trân trọng kính mời</p>
   <h1>Một phong thư<br/>gửi riêng đến bạn.</h1>
   <div className={`intro-decoration ${visible?'':'is-paused'}`} aria-hidden="true">
    <span className="intro-ornament-star">✦</span>
    <span>♡</span>
    <span>❧</span>
    <span>♡</span>
    <span className="intro-ornament-star">✦</span>
   </div>
   <p className="token-bridge-lead">Chạm vào dấu sáp hồng hoặc bấm nút bên dưới để mở phong thư thiệp cưới dành riêng cho bạn.</p>
   {error&&<p className="error" role="alert">{error}</p>}
   <button className="invitation-seal-cta" disabled={busy} onClick={()=>void redeemToken()}>
    <MailOpen size={17} aria-hidden="true"/>
    <span>{busy?'Đang mở phong thư…':'Mở phong thư mời'}</span>
    <Sparkles size={15} aria-hidden="true"/>
   </button>
   <p className="field-hint token-bridge-note">Liên kết cá nhân chứa thông tin buổi tiệc và phần xác nhận tham dự riêng của bạn.</p>
  </section>
 </main>;
}
