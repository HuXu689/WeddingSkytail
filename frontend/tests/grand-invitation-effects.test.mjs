import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const stickersDir = path.resolve('public', 'stickers');
const invitationDir = path.resolve('src', 'features', 'invitation');

const expectedStickers = [
  'floral-corner.svg',
  'royal-crest.svg',
  'wax-seal-song-hy.svg',
  'lovebirds.svg',
  'floral-divider.svg',
  'champagne-toast.svg',
  'gift-chest.svg',
  'butterfly-gold.svg',
  'wedding-rings.svg',
  'love-letter.svg',
  'lantern-wish.svg',
  'floral-arch.svg',
];

test('bộ nhãn dán (stickers) SVG cưới cao cấp đầy đủ và hợp lệ trong public/stickers', () => {
  for (const file of expectedStickers) {
    const fullPath = path.join(stickersDir, file);
    assert.equal(fs.existsSync(fullPath), true, `Thiếu tệp sticker: ${file}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.match(content, /^<svg[\s>]/, `Tệp ${file} phải là SVG hợp lệ`);
    assert.match(content, /<\/svg>\s*$/, `Tệp ${file} phải đóng thẻ </svg>`);
  }
});

test('sân khấu hiệu ứng sticky full-viewport bao phủ toàn bộ các lớp hiệu ứng của thiệp', () => {
  const design = fs.readFileSync(path.join(invitationDir, 'design.tsx'), 'utf8');
  assert.match(design, /className="wedding-effects-viewport"/);
  for (const layer of [
    '<CelebrationOrnaments/>',
    '<FallingRibbons',
    '<PetalShower',
    '<GoldenDust',
    '<ButterflyFlight',
    '<FloatingHearts',
    '<Fireworks',
    '<SparkleTrail/>',
  ]) {
    assert.equal(design.includes(layer), true, `Thiếu lớp hiệu ứng ${layer} trong WeddingCanvas`);
  }
});

test('hiệu ứng pháo hoa và trái tim xóa nền trong suốt mỗi khung hình, không phủ mờ nội dung', () => {
  const fireworks = fs.readFileSync(path.join(invitationDir, 'fireworks.tsx'), 'utf8');
  const hearts = fs.readFileSync(path.join(invitationDir, 'floating-hearts.tsx'), 'utf8');
  assert.match(fireworks, /ctx\.clearRect\(0,\s*0,\s*width,\s*height\)/);
  assert.doesNotMatch(fireworks, /mixBlendMode:\s*'screen'/);
  assert.match(hearts, /ctx!\.clearRect\(0,\s*0,\s*width,\s*height\)/);
});

test('mọi phần chính của thiệp đều được gắn nhãn dán góc hoa và huy hiệu trang trí', () => {
  for (const file of [
    'design.tsx',
    'sections.tsx',
    'album.tsx',
    'wedding-month-calendar.tsx',
    'gift-box.tsx',
    'wish-book.tsx',
    'approved-wishes.tsx',
    'invitation-entry.tsx',
  ]) {
    const content = fs.readFileSync(path.join(invitationDir, file), 'utf8');
    assert.match(content, /SectionCornerStickers/, `${file} thiếu hoa trang trí bốn góc SectionCornerStickers`);
    assert.match(content, /StickerBadge/, `${file} thiếu huy hiệu nhãn dán StickerBadge`);
  }
});
