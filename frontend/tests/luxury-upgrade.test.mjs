import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const read = rel => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const fallbackSource = read('../src/features/invitation/media-fallback.ts')
  .replace("import {oneLine} from '@/shared/text';", 'const oneLine = (s) => String(s ?? "").replace(/\\s+/g, " ").trim();');
const transpiled = ts.transpileModule(fallbackSource, {
  compilerOptions: { module: ts.ModuleKind.ES2022 },
}).outputText;
const {
  FALLBACK_ALBUM,
  FALLBACK_HERO_BY_THEME,
  fallbackAlbumUrl,
  cleanMapUrlInput,
  friendlyTimezone,
  googleCalendarUrl,
} = await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`);

test('FALLBACK-ASSETS: mọi tệp ảnh cưới dự phòng nội bộ đều tồn tại và không rỗng trong public/fallback', () => {
  const allPaths = new Set([
    ...FALLBACK_ALBUM,
    ...Object.values(FALLBACK_HERO_BY_THEME),
  ]);
  for (const webPath of allPaths) {
    const diskPath = path.resolve('public', webPath.replace(/^\//, ''));
    assert.equal(fs.existsSync(diskPath), true, `Thiếu ảnh dự phòng: ${webPath}`);
    assert.ok(fs.statSync(diskPath).size > 10_000, `Ảnh dự phòng ${webPath} kích thước bất thường`);
  }
  assert.equal(fallbackAlbumUrl(0), FALLBACK_ALBUM[0]);
  assert.equal(fallbackAlbumUrl(-1), FALLBACK_ALBUM[FALLBACK_ALBUM.length - 1]);
});

test('URL-SANITIZE: cleanMapUrlInput bóc tách Markdown lỗi và giữ nguyên URL sạch', () => {
  assert.equal(cleanMapUrlInput('   '), '');
  assert.equal(
    cleanMapUrlInput('[Forevermark](https://maps.google.com/?q=Forevermark)'),
    'https://maps.google.com/?q=Forevermark'
  );
  assert.equal(
    cleanMapUrlInput('https://maps.google.com/?q=Forevermark](https://maps.google.com/?q=Forevermark'),
    'https://maps.google.com/?q=Forevermark'
  );
  assert.equal(
    cleanMapUrlInput('https://maps.google.com/?q=Ha+Noi'),
    'https://maps.google.com/?q=Ha+Noi'
  );
});

test('UX-HELPERS: friendlyTimezone Việt hóa múi giờ và googleCalendarUrl tạo liên kết chuẩn UTC', () => {
  assert.equal(friendlyTimezone('Asia/Ho_Chi_Minh'), 'Giờ Việt Nam (GMT+7)');
  assert.equal(friendlyTimezone('UTC'), 'Giờ quốc tế (UTC)');
  const gcal = googleCalendarUrl({
    title: 'Tiệc Cưới Hoàng An & Thanh Bình',
    start: '2026-12-25T11:00:00Z',
    venue: 'Forevermark',
    address: '614 Lạc Long Quân, Hà Nội',
  });
  const parsed = new URL(gcal);
  assert.equal(parsed.origin, 'https://calendar.google.com');
  assert.equal(parsed.searchParams.get('dates'), '20261225T110000Z/20261225T140000Z');
});

test('PERF-IDLE: các lớp canvas hiệu ứng tự động ngủ đông dừng requestAnimationFrame khi hết hạt', () => {
  const fireworks = read('../src/features/invitation/fireworks.tsx');
  const sparkles = read('../src/features/invitation/sparkle-trail.tsx');
  const hearts = read('../src/features/invitation/floating-hearts.tsx');
  assert.match(fireworks, /rocketsRef\.current\.length === 0 && particlesRef\.current\.length === 0/);
  assert.match(sparkles, /if \(sparklesRef\.current\.length === 0\)/);
  assert.match(sparkles, /visibilitychange/);
  assert.match(hearts, /count === 0 && heartsRef\.current\.length === 0/);
});

test('GUEST-EXPERIENCE: điều hướng nhanh, gợi ý lời chúc, sao chép địa chỉ và sao chép quà mừng đầy đủ', () => {
  const design = read('../src/features/invitation/design.tsx');
  const guest = read('../src/app/invitation/[id]/page.tsx');
  const wish = read('../src/features/invitation/wish-book.tsx');
  const gift = read('../src/features/invitation/gift-box.tsx');
  assert.match(design, /<InvitationQuickNav/);
  assert.match(design, /onToggleEffects=/);
  assert.match(guest, /Sao chép địa chỉ/);
  assert.match(guest, /Lịch Google ↗/);
  assert.match(guest, /people-stepper/);
  assert.match(wish, /WISH_SUGGESTIONS/);
  assert.match(gift, /Sao chép thông tin/);
});
