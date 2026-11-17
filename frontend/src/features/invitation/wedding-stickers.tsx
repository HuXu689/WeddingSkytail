import type {ReactNode} from 'react';

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

/**
 * Hệ thống nhãn dán (Stickers), hoa góc và dải phân cách hoa văn tinh tế cho thiệp mời cưới.
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
      <img src={`/stickers/${kind}.svg`} alt="" loading="lazy" decoding="async" />
    </span>
  );
}

/**
 * Hoa góc tinh tế, độ mờ dịu để tôn nội dung mà không che chữ.
 */
export function SectionCornerStickers({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`section-corner-stickers${compact ? ' is-compact' : ''}`} aria-hidden="true">
      <img className="corner-bouquet bouquet-tl" src="/stickers/floral-corner.svg" alt="" loading="lazy" decoding="async" />
      <img className="corner-bouquet bouquet-tr" src="/stickers/floral-corner.svg" alt="" loading="lazy" decoding="async" />
      {!compact && <img className="corner-bouquet bouquet-bl" src="/stickers/floral-corner.svg" alt="" loading="lazy" decoding="async" />}
      {!compact && <img className="corner-bouquet bouquet-br" src="/stickers/floral-corner.svg" alt="" loading="lazy" decoding="async" />}
    </div>
  );
}

/**
 * Dải hoa văn kết nối giữa các phần lớn trên thiệp mời.
 */
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
        <img className="ornate-divider-svg" src="/stickers/floral-divider.svg" alt="" loading="lazy" decoding="async" />
        <div className="ornate-divider-badge">
          <img src={`/stickers/${sticker}.svg`} alt="" loading="lazy" decoding="async" />
        </div>
      </div>
      {caption && <span className="ornate-divider-caption">{caption}</span>}
    </div>
  );
}

/**
 * Huy hiệu nhãn dán đính ở đầu mỗi phần nội dung.
 */
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
        <img src={`/stickers/${sticker}.svg`} alt="" loading="lazy" decoding="async" />
      </span>
      <span className="sticker-badge-label">{label}</span>
      {children}
    </div>
  );
}

export function FloatingSideStickers() {
  return null;
}
