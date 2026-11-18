import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const read = rel => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

function transpileWithTextMock(source) {
  const mocked = source.replace(
    "import {oneLine} from '@/shared/text';",
    "const oneLine = (s) => String(s ?? '').normalize('NFC').replace(/\\s+/g, ' ').trim();"
  );
  const js = ts.transpileModule(mocked, {
    compilerOptions: { module: ts.ModuleKind.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
}

const mediaFallback = await transpileWithTextMock(read('../src/features/invitation/media-fallback.ts'));
const guestGreeting = await transpileWithTextMock(read('../src/features/invitation/guest-greeting.ts'));

test('FALLBACK-MEDIA-2: tệp nhạc cưới dự phòng và bộ ảnh chân dung/cột mốc tồn tại đầy đủ', () => {
  const requiredAssets = [
    mediaFallback.FALLBACK_AUDIO_URL,
    mediaFallback.FALLBACK_PORTRAITS.GROOM,
    mediaFallback.FALLBACK_PORTRAITS.BRIDE,
    ...mediaFallback.FALLBACK_LOVE_STORY,
  ];
  for (const webPath of requiredAssets) {
    const diskPath = path.resolve('public', webPath.replace(/^\//, ''));
    assert.equal(fs.existsSync(diskPath), true, `Thiếu tài nguyên dự phòng: ${webPath}`);
    assert.ok(fs.statSync(diskPath).size > 20_000, `Tài nguyên ${webPath} quá nhỏ bất thường`);
  }
  assert.equal(mediaFallback.fallbackPortraitUrl('Cô dâu xinh đẹp', 0), '/fallback/bride-portrait.jpg');
  assert.equal(mediaFallback.fallbackPortraitUrl('Chú rể lịch lãm', 1), '/fallback/groom-portrait.jpg');
});

test('CALENDAR-ICS-CLIENT: buildIcsContent sinh tệp lịch chuẩn RFC 5545 có gấp dòng ≤75 octet', () => {
  const ics = mediaFallback.buildIcsContent({
    uid: 'ceremony-test-01',
    title: 'Lễ Thành Hôn Hoàng An & Thanh Bình',
    start: '2026-12-25T04:00:00Z',
    durationMinutes: 180,
    venue: 'Trung tâm Forevermark, Sảnh Arabian',
    address: '614 Lạc Long Quân, Quận Tây Hồ, Hà Nội',
    description: 'Trân trọng kính mời quý khách đến chung vui; có bãi đỗ xe miễn phí.',
  });
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART:20261225T040000Z/);
  assert.match(ics, /DTEND:20261225T070000Z/);
  assert.match(ics, /END:VEVENT\r\nEND:VCALENDAR\r\n$/);
  for (const line of ics.trim().split('\r\n')) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `Dòng ICS vượt 75 octet: ${line}`);
  }
});

test('GUEST-PERSONALIZATION: parsePublicGuestGreeting chuẩn hóa NFC, giới hạn độ dài và tạo URL sạch', () => {
  assert.equal(guestGreeting.parsePublicGuestGreeting(''), null);
  const nfdName = 'Anh Tuấn & Gia đình'.normalize('NFD');
  const parsed = guestGreeting.parsePublicGuestGreeting(`?guest=${encodeURIComponent(nfdName)}&salutation=Th%C3%A2n+m%E1%BB%9Di`);
  assert.ok(parsed);
  assert.equal(parsed.guestName, 'Anh Tuấn & Gia đình');
  assert.equal(parsed.salutation, 'Thân mời');
  assert.equal(parsed.openCeremony, true);

  const shareUrl = guestGreeting.buildPersonalizedPublicUrl('https://cuoi.vn/', 'our-wedding', 'Chị Lan Anh', 'Thân mời');
  const u = new URL(shareUrl);
  assert.equal(u.pathname, '/w/our-wedding');
  assert.equal(u.searchParams.get('guest'), 'Chị Lan Anh');
  assert.equal(u.searchParams.get('salutation'), 'Thân mời');
});

test('TYPOGRAPHY-VN: tích hợp bộ font cưới tiếng Việt Cormorant Garamond + Be Vietnam Pro tự lưu trữ', () => {
  const layout = read('../src/app/layout.tsx');
  const typo = read('../src/features/invitation/luxury-typography.css');
  assert.match(layout, /@fontsource\/cormorant-garamond\/400\.css/);
  assert.match(layout, /@fontsource\/be-vietnam-pro\/400\.css/);
  assert.match(typo, /'Cormorant Garamond'/);
  assert.match(typo, /'Be Vietnam Pro'/);
  assert.match(typo, /text-rendering:\s*auto/);
});

test('STORYTELLING-AND-UX: đầy đủ cột mốc tình yêu, nghi thức phong bì, nhạc dự phòng, RSVP thông minh và lưu bút live', () => {
  const sections = read('../src/features/invitation/sections.tsx');
  const design = read('../src/features/invitation/design.tsx');
  const music = read('../src/features/invitation/music-control.tsx');
  const guestPage = read('../src/app/invitation/[id]/page.tsx');
  const wishFeed = read('../src/features/invitation/wish-feed.tsx');
  const adminInv = read('../src/app/admin/invitations/page.tsx');
  const adminResp = read('../src/app/admin/responses/page.tsx');

  assert.match(sections, /love-milestones/);
  assert.match(sections, /guest-tips-grid/);
  assert.match(sections, /downloadEventIcs/);
  assert.match(design, /<ScrollProgressBar\/>/);
  assert.match(design, /<EnvelopeCeremonyOverlay/);
  assert.match(music, /FALLBACK_AUDIO_URL/);
  assert.match(music, /music-soundwave/);
  assert.match(guestPage, /RSVP_CARE_TAGS/);
  assert.match(guestPage, /wedding-pass-card/);
  assert.match(wishFeed, /wedding-wishes-live/);
  assert.match(wishFeed, /wish-feed-toolbar/);
  assert.match(adminInv, /<QuickPublicSharePanel\/>/);
  assert.match(adminResp, /response-care-summary/);
});

test('ROYAL-CEREMONY-AND-ADMIN-GUARD: phong bì 3D đóng kín lúc nghỉ, mở màn đồng nhất thiệp chung/riêng, lightbox chân dung và bảo vệ ảnh section', () => {
  const ceremony = read('../src/features/invitation/envelope-ceremony.tsx');
  const luxuryCss = read('../src/features/invitation/luxury-experience.css');
  const grandCss = read('../src/features/invitation/grand-effects.css');
  const sections = read('../src/features/invitation/sections.tsx');
  const entry = read('../src/features/invitation/invitation-entry.tsx');
  const guestPage = read('../src/app/invitation/[id]/page.tsx');
  const tokenPage = read('../src/app/i/[token]/page.tsx');
  const adminMedia = read('../src/app/admin/media/page.tsx');
  const adminWishes = read('../src/app/admin/wishes/page.tsx');
  const quickShare = read('../src/features/admin/quick-public-share.tsx');

  assert.match(ceremony, /luxury-seal-pulse/);
  assert.match(ceremony, /wedding:fireworks/);
  assert.match(luxuryCss, /\.luxury-envelope-flap\s*\{[^}]*transform:\s*rotateX\(0deg\)/s);
  assert.match(luxuryCss, /\.luxury-3d-envelope\.is-unsealing\s+\.luxury-envelope-flap\s*\{[^}]*rotateX\(180deg\)/s);
  assert.match(luxuryCss, /\.wedding-canvas\s+\.invitation-quick-nav\s*\{[^}]*position:\s*sticky/s);
  assert.doesNotMatch(grandCss, /\.wedding-canvas::after/);

  assert.match(entry, /onOpened:\s*\(data:\s*T,\s*fromSeal\?:\s*boolean\)\s*=>\s*void/);
  assert.match(guestPage, /ceremonyEntrance=\{ceremonyEntrance\}/);
  assert.match(tokenPage, /token-bridge-card/);
  assert.match(tokenPage, /envelope-pocket/);

  assert.match(sections, /IntroPhotoLightbox/);
  assert.match(sections, /photo-zoom-trigger/);

  assert.match(adminMedia, /row\.draft_section\s*\|\|\s*row\.published_section/);
  assert.match(adminWishes, /Lưu & Duyệt/);
  assert.match(quickShare, /\/admin\/wedding/);
});

test('AUTO-EFFECTS-AND-REAL-HEARTS: pháo hoa & mưa hoa chạy tự động, thả tim thiệp và thả tim lời chúc ghi nhận số liệu thật từ máy chủ', () => {
  const design = read('../src/features/invitation/design.tsx');
  const petals = read('../src/features/invitation/petal-shower.tsx');
  const fireworks = read('../src/features/invitation/fireworks.tsx');
  const wishFeed = read('../src/features/invitation/wish-feed.tsx');
  const bar = read('../src/features/invitation/celebration-bar.tsx');

  assert.match(design, /<Fireworks mode=\{preview\?'burst':'continuous'\}/);
  assert.match(design, /<PetalShower intensity=\{atmosphere==='sakura'\?'dense':'normal'\}/);
  assert.match(design, /cover-heart-pill-btn/);
  assert.match(design, /cardHeartPath\(resolvedHeartScope\)/);
  assert.match(petals, /lastBreeze/);
  assert.match(fireworks, /mode === 'continuous'/);
  assert.match(wishFeed, /wishHeartPath\(scope,wishId\)/);
  assert.match(wishFeed, /wish\.heart_count/);
  assert.match(bar, /onSendHeart/);
});

test('SYMMETRIC-CORNERS-AND-SOFT-FULL-BLEED-ATMOSPHERE: 4 góc viền hoa đối xứng tuyệt đối và nền không khí phủ tràn màn hình dịu nhẹ', () => {
  const ornaments = read('../src/features/invitation/celebration-ornaments.tsx');
  const celebrationCss = read('../src/features/invitation/celebration.css');
  const extraCss = read('../src/features/invitation/grand-effects-extra.css');
  const luxuryCss = read('../src/features/invitation/luxury-experience.css');

  assert.equal((ornaments.match(/M12 168V12h156/g) || []).length, 4, 'Cả 4 góc phải dùng chung một tọa độ gốc để đối xứng tuyệt đối');
  assert.doesNotMatch(ornaments, /M168 12V168H12/);
  assert.match(celebrationCss, /\.celebration-corner\.corner-bottom-left\{[^}]*transform:scaleY\(-1\)/);
  assert.match(extraCss, /body:has\(\.wedding-canvas\.atmosphere-crimson\)/);
  assert.match(luxuryCss, /\.wedding-canvas\s+\.wedding-body\s*\{[^}]*background:\s*transparent\s*!important/s);
});

test('MODERN-AUTO-ALBUM-AND-RICH-TYPOGRAPHY: trình chiếu album tự động mượt mà (đã bỏ nút Trình chiếu kỷ niệm) và nền/chữ đậm rõ chống chói trắng', () => {
  const album = read('../src/features/invitation/album.tsx');
  const slideshow = read('../src/features/invitation/album-slideshow.ts');
  const typoCss = read('../src/features/invitation/luxury-typography.css');
  const extraCss = read('../src/features/invitation/grand-effects-extra.css');

  assert.doesNotMatch(album, /Trình chiếu kỷ niệm/);
  assert.match(album, /autoRunning=urls\.length>1&&lightbox===null&&!hovered/);
  assert.match(album, /album-stage-current/);
  assert.match(album, /album-progress-fill/);
  assert.match(album, /album-stage-strip/);
  assert.match(slideshow, /requestAnimationFrame/);
  assert.match(typoCss, /--inv-ink:\s*#181613/);
  assert.match(extraCss, /--atmosphere-paper:\s*#f3ede1/);
});

test('ALBUM-SILK-TRANSITION: chuyển ảnh đồng bộ không chớp tối (zero-tearing), tiền giải mã lớp kề cận, phân tầng 4 ảnh phụ và Lightbox hai lớp mượt mà', async () => {
  const albumWindowSrc = read('../src/features/invitation/album-window.ts');
  const albumWindowJs = ts.transpileModule(albumWindowSrc, {
    compilerOptions: { module: ts.ModuleKind.ES2022 },
  }).outputText;
  const windowDataUrl = `data:text/javascript;base64,${Buffer.from(albumWindowJs).toString('base64')}`;

  const slideshowRaw = read('../src/features/invitation/album-slideshow.ts')
    .replace("'use client';", '')
    .replace(/import\s*\{[^}]*\}\s*from\s*'react';/, 'const useCallback=fn=>fn,useEffect=()=>{},useRef=v=>({current:v}),useState=init=>[typeof init==="function"?init():init,()=>{}];')
    .replace("from './album-window'", `from '${windowDataUrl}'`);
  const slideshowJs = ts.transpileModule(slideshowRaw, {
    compilerOptions: { module: ts.ModuleKind.ES2022 },
  }).outputText;
  const mod = await import(`data:text/javascript;base64,${Buffer.from(slideshowJs).toString('base64')}`);

  assert.equal(mod.shortestDirection(0, 1, 9), 1);
  assert.equal(mod.shortestDirection(0, 8, 9), -1);
  assert.equal(mod.shortestDirection(8, 0, 9), 1);
  assert.equal(mod.shortestDirection(5, 2, 9), -1);

  // Tối đa 4 lớp duy nhất được sắp xếp tăng dần để React không đảo DOM gây chớp hình
  assert.deepEqual(mod.computeStageLayers(0, null, 9), [0, 1, 8]);
  assert.deepEqual(mod.computeStageLayers(4, 1, 200), [1, 3, 4, 5]);
  assert.deepEqual(mod.computeStageLayers(0, null, 1), [0]);
  assert.deepEqual(mod.computeStageLayers(0, null, 0), []);

  // Bước kế cận đồng bộ ngay lập tức prev + sidePrev trong cùng 1 commit, không phải nhảy mới (freshJump = false)
  const s0 = mod.createInitialSlideState(0);
  const s1 = mod.transitionSlideState(s0, 1, 9, 1);
  assert.equal(s1.active, 1);
  assert.equal(s1.prev, 0);
  assert.equal(s1.direction, 1);
  assert.equal(s1.freshJump, false);
  assert.deepEqual(s1.sidePrev, [1, 2, 3, 4]);

  // Nhảy cóc qua ảnh xa bật cờ freshJump = true và tự chọn hướng ngắn nhất
  const sJump = mod.transitionSlideState(s1, 7, 9);
  assert.equal(sJump.active, 7);
  assert.equal(sJump.prev, 1);
  assert.equal(sJump.direction, -1);
  assert.equal(sJump.freshJump, true);
  assert.deepEqual(sJump.sidePrev, [2, 3, 4, 5]);

  const album = read('../src/features/invitation/album.tsx');
  const luxuryCss = read('../src/features/invitation/luxury-experience.css');
  assert.match(album, /album-stage-viewport/);
  assert.match(album, /album-stage-frame/);
  assert.match(album, /album-side-layer/);
  assert.match(album, /lightbox-stage/);
  assert.match(album, /lightbox-img-prev/);
  assert.match(luxuryCss, /\.album-stage-frame\.is-leaving/);
  assert.match(luxuryCss, /@keyframes albumSideLayerIn/);
  assert.match(luxuryCss, /@keyframes lightboxEnterNext/);
});
