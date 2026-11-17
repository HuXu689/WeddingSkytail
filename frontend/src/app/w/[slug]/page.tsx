'use client';
import {use,useEffect,useState} from 'react';
import {api} from '@/shared/api';
import {GiftBox} from '@/features/invitation/gift-box';
import {ApprovedWishes} from '@/features/invitation/approved-wishes';
import {WeddingCanvas,type WeddingDesign} from '@/features/invitation/design';
import {WeddingMonthCalendar} from '@/features/invitation/wedding-month-calendar';
import {SectionCornerStickers,StickerBadge,WeddingSticker} from '@/features/invitation/wedding-stickers';
import {publicCalendar} from '@/shared/wedding-calendar';

export default function PublicWedding({params}:{params:Promise<{slug:string}>}) {
 const {slug}=use(params);
 const [data,setData]=useState<WeddingDesign|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;setData(null);setError('');
  api<WeddingDesign>(`/public/weddings/${slug}`)
   .then(value=>{if(active)setData(value);})
   .catch(()=>{if(active)setError('Thiệp chung chưa được công bố hoặc tạm thời không thể tải.');});
  return()=>{active=false;};
 },[slug]);
 const calendarItems=data?publicCalendar(data.sections??[]):[];
 const countdownTo=calendarItems
  .map(item=>item.at)
  .filter(at=>Number.isFinite(Date.parse(at))&&Date.parse(at)>Date.now())
  .sort()[0]??null;
 return <main className="public-wedding-page">
  {data?<>
   <WeddingCanvas design={data} calendar={<WeddingMonthCalendar items={calendarItems}/>} countdownTo={countdownTo} gift={<GiftBox scope={{kind:'public',slug}}/>} wishes={<ApprovedWishes slug={slug}/>} publicMode/>
   <aside className="public-invitation-note" aria-label="Lưu ý dành cho khách mời">
    <span className="public-note-badge">Thiệp mời chung</span>
    <p>Thông tin buổi tiệc, giờ đón tiếp và mục xác nhận tham dự nằm trong đường link hoặc mã QR lời mời riêng được gửi tới bạn.</p>
   </aside>
  </>:<section className="hero public-status-card">
   <SectionCornerStickers compact/>
   <div className="entry-floating-stickers" aria-hidden="true">
    <WeddingSticker kind="royal-crest" size={84}/>
   </div>
   <StickerBadge sticker="wax-seal-song-hy" label="Thiệp cưới công khai"/>
   <p className="eyebrow">Lời mời cưới</p>
   <h1>Một lời mời</h1>
   <p role="status">{error||'Đang tải thiệp…'}</p>
   {error&&<div className="row" style={{justifyContent:'center'}}><a className="button secondary" href="/">Quay về trang chủ</a></div>}
  </section>}
 </main>;
}
