import {SectionCornerStickers,StickerBadge,WeddingSticker} from '@/features/invitation/wedding-stickers';

export default function Home() {
 return <main className="welcome-shell">
  <section className="welcome-card">
   <SectionCornerStickers compact/>
   <div className="welcome-crest" aria-hidden="true">
    <WeddingSticker kind="royal-crest" size={96}/>
   </div>
   <StickerBadge sticker="wedding-rings" label="Lễ thành hôn"/>
   <p className="eyebrow">Hẹn ngày chung đôi</p>
   <h1>Một lời mời,<br/><em>một câu chuyện.</em></h1>
   <p className="welcome-lead">Hạnh phúc trọn vẹn hơn khi có bạn cùng sẻ chia khoảnh khắc thiêng liêng này.</p>
   <div className="welcome-divider" aria-hidden="true"><span>♡</span></div>
   <div className="welcome-guide-grid">
    <div className="welcome-guide-item">
     <strong>Khách có thiệp riêng</strong>
     <p>Quét mã QR trên thiệp giấy hoặc mở liên kết cá nhân được gửi riêng để xem buổi tiệc và xác nhận tham dự.</p>
    </div>
    <div className="welcome-guide-item">
     <strong>Khách ghé thăm chung vui</strong>
     <p>Khám phá câu chuyện tình yêu, lịch trình ngày cưới, album kỷ niệm và sổ lưu bút chúc phúc.</p>
    </div>
   </div>
   <div className="row welcome-actions" style={{justifyContent:'center'}}>
    <a className="button" href="/w/our-wedding">Mở thiệp cưới chung <span aria-hidden="true">→</span></a>
    <a className="button secondary welcome-admin-btn" href="/admin">Không gian quản trị</a>
   </div>
  </section>
  <div className="welcome-note">Lưu giữ yêu thương · Chia sẻ hạnh phúc</div>
 </main>;
}
