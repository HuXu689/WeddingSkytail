'use client';
import {useEffect,useState} from 'react';
import {MailOpen,Sparkles} from 'lucide-react';
import {coupleNames,oneLine} from '@/shared/text';
import {SectionCornerStickers,StickerBadge,WeddingSticker} from './wedding-stickers';

/**
 * Nghi thức Mở Phong Bì Sáp Niêm Phong 3D giàu cảm xúc:
 * - Hiển thị khi khách mở thiệp chung qua liên kết cá nhân hóa (?guest=...) hoặc bấm "Mở phong thư kỷ niệm".
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onComplete();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onComplete]);

  function triggerOpen() {
    if (stage === 'opening') return;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wedding:petals'));
      window.dispatchEvent(new CustomEvent('wedding:hearts'));
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        onComplete();
        return;
      }
    }
    setStage('opening');
    window.setTimeout(() => {
      onComplete();
    }, 820);
  }

  return (
    <div
      className={`envelope-ceremony-backdrop${stage === 'opening' ? ' is-opening' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Phong thư thiệp cưới trân trọng kính mời"
    >
      <div className="envelope-ceremony-card">
        <SectionCornerStickers compact />
        <StickerBadge sticker="wax-seal-song-hy" label="Thiệp hồng báo hỷ" />
        <p className="eyebrow">{oneLine(salutation || 'Trân trọng kính mời')}</p>
        {guestName && <h2 className="ceremony-guest-title">{oneLine(guestName)}</h2>}

        <div className={`luxury-3d-envelope${stage === 'opening' ? ' is-unsealing' : ''}`} aria-hidden="true">
          <div className="luxury-envelope-back" />
          <div className="luxury-envelope-insert">
            <span className="luxury-insert-kicker">Lễ Thành Hôn</span>
            <strong>{parts.join(' & ')}</strong>
            <span className="luxury-insert-sub">Trăm năm hạnh phúc</span>
          </div>
          <div className="luxury-envelope-pocket" />
          <div className="luxury-envelope-flap" />
          <div className="luxury-wax-seal">
            <WeddingSticker kind="wax-seal-song-hy" size={54} />
          </div>
        </div>

        <p className="ceremony-envelope-lead">
          {guestName
            ? `Một tấm thiệp nhỏ gói trọn niềm thương mến gửi tới ${oneLine(guestName)}.`
            : 'Chạm nhẹ dấu sáp hồng để mở tấm thiệp chung vui cùng hai gia đình.'}
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
