'use client';
import {useEffect,useState} from 'react';
import {MailOpen,Sparkles} from 'lucide-react';
import {coupleNames,oneLine} from '@/shared/text';
import {SectionCornerStickers,StickerBadge,WeddingSticker} from './wedding-stickers';

/**
 * Nghi thức Mở Phong Bì Sáp Niêm Phong 3D Hoàng Gia:
 * - Nắp phong bì khép kín ở trạng thái niêm phong, khóa bằng dấu sáp Song Hỷ 3D nổi khối.
 * - Hỗ trợ chạm trực tiếp vào dấu sáp / phong bì hoặc nút bấm để mở phong thư.
 * - Chuyển động bằng GPU (transform / opacity), tự động bỏ trễ khi bật prefers-reduced-motion.
 */
export function EnvelopeCeremonyOverlay({
  names,
  guestName,
  salutation = 'Trân trọng kính mời',
  onComplete,
}: {
  names: string;
  guestName?: string;
  salutation?: string;
  onComplete: () => void;
}) {
  const [stage, setStage] = useState<'sealed' | 'opening'>('sealed');
  const parts = coupleNames(names || 'Tên hai bạn');
  const monogram = parts
    .map(part => part.trim().split(/\s+/).pop()?.[0]?.toUpperCase() ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join(' · ');

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onComplete();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onComplete]);

  function triggerOpen() {
    if (stage === 'opening') return;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wedding:petals'));
      window.dispatchEvent(new CustomEvent('wedding:hearts'));
      window.dispatchEvent(new CustomEvent('wedding:fireworks'));
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        onComplete();
        return;
      }
    }
    setStage('opening');
    window.setTimeout(() => {
      onComplete();
    }, 980);
  }

  return (
    <div
      className={`envelope-ceremony-backdrop${stage === 'opening' ? ' is-opening' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Phong thư thiệp cưới trân trọng kính mời"
      onClick={event => {
        if (event.target === event.currentTarget) triggerOpen();
      }}
    >
      <div className="envelope-ceremony-card">
        <SectionCornerStickers compact />
        <StickerBadge sticker="wax-seal-song-hy" label="Thiệp hồng báo hỷ" />
        <p className="eyebrow">{oneLine(salutation || 'Trân trọng kính mời')}</p>
        {guestName ? (
          <h2 className="ceremony-guest-title">{oneLine(guestName)}</h2>
        ) : (
          <h2 className="ceremony-guest-title">{parts.join(' & ')}</h2>
        )}

        <div
          className={`luxury-3d-envelope${stage === 'opening' ? ' is-unsealing' : ''}`}
          onClick={triggerOpen}
          aria-hidden="true"
        >
          <div className="luxury-envelope-glow" />
          <div className="luxury-envelope-back" />
          <div className="luxury-envelope-insert">
            <span className="luxury-insert-kicker">✦ Lễ Thành Hôn ✦</span>
            <strong>{parts.join(' & ')}</strong>
            <span className="luxury-insert-sub">Trăm năm hạnh phúc · Vĩnh kết đồng tâm</span>
          </div>
          <div className="luxury-envelope-pocket">
            {monogram && <span className="luxury-pocket-monogram">{monogram}</span>}
          </div>
          <div className="luxury-envelope-flap" />
          <div className="luxury-wax-seal">
            <span className="luxury-seal-pulse" />
            <WeddingSticker kind="wax-seal-song-hy" size={62} />
          </div>
        </div>

        <p className="ceremony-envelope-lead">
          {guestName
            ? `Một tấm thiệp nhỏ gói trọn niềm thương mến gửi riêng tới ${oneLine(guestName)}. Chạm vào dấu sáp hồng để mở thiệp.`
            : 'Chạm nhẹ dấu sáp hồng Song Hỷ để mở cánh thiệp và bước vào không gian ngày chung đôi.'}
        </p>

        <div className="ceremony-envelope-actions">
          <button type="button" className="ceremony-open-btn" onClick={triggerOpen}>
            <MailOpen size={17} aria-hidden="true" />
            <span>{stage === 'opening' ? 'Đang mở phong thư…' : 'Chạm mở phong thư'}</span>
            <Sparkles size={15} aria-hidden="true" />
          </button>
          <button type="button" className="secondary ceremony-skip-btn" onClick={onComplete}>
            Xem ngay nội dung
          </button>
        </div>
      </div>
    </div>
  );
}
