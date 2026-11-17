import {SectionCornerStickers,StickerBadge,WeddingSticker} from '@/features/invitation/wedding-stickers';

export default function Home() {
 return <main className="welcome-shell">
  <section className="welcome-card">
   <SectionCornerStickers compact/>
   <div className="welcome-crest" aria-hidden="true">
    <WeddingSticker kind="royal-crest" size={108}/>
   </div>
   <StickerBadge sticker="wedding-rings" label="Lễ thành hôn"/>
   <div className="welcome-flower" aria-hidden="true">✦</div>
   <p className="eyebrow">Hẹn ngày chung đôi</p>
   <h1>Một lời mời,<br/><em>một câu chuyện.</em></h1>
   <p className="welcome-lead">Hạnh phúc trọn vẹn hơn khi có bạn cùng sẻ chia khoảnh khắc đặc biệt này.</p>
   <div className="welcome-divider"><span>♡</span></div>
   <p className="muted">Hãy mở đường link hoặc quét mã QR trên lời mời của bạn để khám phá thông tin và xác nhận tham dự.</p>
   <div className="row welcome-actions" style={{justifyContent:'center'}}><a className="button" href="/w/our-wedding">Mở thiệp cưới <span aria-hidden="true">→</span></a><a className="text-link" href="/admin">Khu vực quản trị</a></div>
  </section>
  <div className="welcome-note">Lưu giữ yêu thương · Chia sẻ hạnh phúc</div>
 </main>;
}
