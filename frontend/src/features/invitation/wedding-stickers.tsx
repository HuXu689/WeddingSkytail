'use client';
import type {ReactNode,SyntheticEvent} from 'react';

export type StickerKind =
  | 'floral-corner'
  | 'royal-crest'
  | 'wax-seal-song-hy'
  | 'lovebirds'
  | 'floral-divider'
  | 'champagne-toast'
  | 'gift-chest'
  | 'butterfly-gold'
  | 'wedding-rings'
  | 'love-letter'
  | 'lantern-wish'
  | 'floral-arch';

function hideOnBroken(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.style.display = 'none';
}

/**
 * Hệ thống nhãn dán (Stickers), hoa góc và dải phân cách hoa văn tinh tế cho thiệp mời cưới.
 * Mọi thẻ <img> đều tự ẩn an toàn nếu lỗi mạng để không bao giờ lộ biểu tượng vỡ ảnh.
 */
export function WeddingSticker({
  kind,
  className = '',
  size = 64,
}: {
  kind: StickerKind;
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={`wedding-sticker sticker-${kind}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img src={`/stickers/${kind}.svg`} alt="" loading="lazy" decoding="async" onError={hideOnBroken} />
    </span>
  );
}

export function SectionCornerStickers({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`section-corner-stickers${compact ? ' is-compact' : ''}`} aria-hidden="true">
      <img className="corner-bouquet bouquet-tl" src="/stickers/floral-corner.svg" alt="" loading="lazy" decoding="async" onError={hideOnBroken} />
      <img className="corner-bouquet bouquet-tr" src="/stickers/floral-corner.svg" alt="" loading="lazy" decoding="async" onError={hideOnBroken} />
      {!compact && <img className="corner-bouquet bouquet-bl" src="/stickers/floral-corner.svg" alt="" loading="lazy" decoding="async" onError={hideOnBroken} />}
      {!compact && <img className="corner-bouquet bouquet-br" src="/stickers/floral-corner.svg" alt="" loading="lazy" decoding="async" onError={hideOnBroken} />}
    </div>
  );
}

export function OrnateDivider({
  sticker = 'wedding-rings',
  caption,
}: {
  sticker?: StickerKind;
  caption?: string;
}) {
  return (
    <div className="ornate-section-divider" aria-hidden="true">
      <div className="ornate-divider-line">
        <img className="ornate-divider-svg" src="/stickers/floral-divider.svg" alt="" loading="lazy" decoding="async" onError={hideOnBroken} />
        <div className="ornate-divider-badge">
          <img src={`/stickers/${sticker}.svg`} alt="" loading="lazy" decoding="async" onError={hideOnBroken} />
        </div>
      </div>
      {caption && <span className="ornate-divider-caption">{caption}</span>}
    </div>
  );
}

export function StickerBadge({
  sticker,
  label,
  children,
}: {
  sticker: StickerKind;
  label: string;
  children?: ReactNode;
}) {
  return (
    <div className="invitation-sticker-badge" aria-hidden="true">
      <span className="sticker-badge-icon">
        <img src={`/stickers/${sticker}.svg`} alt="" loading="lazy" decoding="async" onError={hideOnBroken} />
      </span>
      <span className="sticker-badge-label">{label}</span>
      {children}
    </div>
  );
}

export function FloatingSideStickers() {
  return null;
}
