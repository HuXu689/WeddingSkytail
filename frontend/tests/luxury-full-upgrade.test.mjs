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
