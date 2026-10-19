import test from 'node:test';
import {resolveCompatibilityColors} from './helpers/css-tokens.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

/**
 * ART-001 + TYPO-001 — art direction cho MẪU CHUẨN (ELEGANT) và quy tắc typography tiếng Việt.
 *
 * Vì sao khoá bằng CSS chứ không bằng ảnh chụp: ảnh chụp không chạy trong CI, còn các quyết
 * định dưới đây (hai họ font, không letter-spacing trên câu tiếng Việt, cỡ chữ đọc được ở
 * khung hẹp, bảng màu chỉ áp cho một mẫu, hoạ tiết không chặn click) là thứ dễ bị phá lặng lẽ
 * khi sửa CSS ở phiên sau.
 */
const css = resolveCompatibilityColors(readFileSync(new URL('../src/features/invitation/design.css', import.meta.url), 'utf8'));
const globals = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');

const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Chuỗi khai báo trong rule đầu tiên khớp `selector` (rule trong file không lồng nhau). */
function declarations(selector) {
  const index = css.indexOf(`${selector}{`);
  assert.notEqual(index, -1, `Không tìm thấy rule ${selector}{ trong design.css`);
  return css.slice(index + selector.length + 1, css.indexOf('}', index));
}

/** Mọi giá trị font-size đã khai báo cho `selector`, quy về px (với clamp lấy cận dưới). */
function fontSizes(selector) {
  const sizes = [];
  for (const rule of css.matchAll(new RegExp(`${escape(selector)}\\{([^}]*)\\}`, 'g'))) {
    for (const size of rule[1].matchAll(/font-size:([^;}]+)/g)) {
      const raw = size[1].trim();
      const px = raw.match(/^clamp\(\s*(\d+(?:\.\d+)?)px/) ?? raw.match(/^(\d+(?:\.\d+)?)px$/);
      if (px) sizes.push(Number(px[1]));
    }
  }
  return sizes;
}

test('ART-001: token art direction khai báo một lần và trỏ về token chung', () => {
  const canvas = declarations('.wedding-canvas');
  for (const token of ['--inv-serif', '--inv-sans', '--inv-paper', '--inv-paper-deep', '--inv-ink', '--inv-champagne', '--inv-champagne-soft', '--inv-hairline']) {
    assert.match(canvas, new RegExp(`${token}:`), `Thiếu token ${token} trên .wedding-canvas`);
  }
  assert.match(canvas, /--inv-serif:var\(--font-serif/);
  assert.match(canvas, /--inv-sans:var\(--font-body/);
  assert.match(globals, /--font-serif:Georgia,'Times New Roman',serif/);
  assert.match(globals, /--font-body:Arial,'Segoe UI',sans-serif/);
});

test('ART-001: art direction chỉ áp cho mẫu chuẩn, TRADITIONAL/MODERN giữ nguyên', () => {
  assert.match(css, /\.wedding-canvas\.theme-elegant\{background:var\(--inv-paper\);color:var\(--inv-ink\)\}/);
  assert.match(css, /\.theme-traditional\{border:6px double var\(--wedding-accent\);background:#fff8ed\}/);
  assert.match(css, /\.theme-modern \.wedding-cover h1\{font-family:Arial,sans-serif;font-weight:700/);
  assert.match(css, /\.theme-modern \.wedding-rule\{margin-left:0;width:140px\}/);
});

test('ART-001: champagne dùng tiết chế, không làm màu chữ vì tương phản thấp', () => {
  assert.match(css, /\.theme-elegant \.cover-photo\+\.cover-content \.eyebrow\{color:var\(--inv-champagne-soft\)\}/);
  assert.doesNotMatch(css, /[;{]color:var\(--inv-champagne\)/, 'Champagne đậm không được dùng làm màu chữ');
  assert.match(css, /\.theme-elegant \.event-number\{background:var\(--inv-champagne-soft\);color:#6b5324\}/);
});
test('ART-001: hero giữ sức sống ảnh, không phủ tối hai lớp', () => {
  assert.match(css, /\.theme-elegant \.cover-photo::after\{background:linear-gradient\(180deg,rgba\(20,26,20,\.03\)/);
  assert.match(css, /\.theme-elegant \.wedding-cover:not\(:has\(\.cover-photo\)\) \.cover-content::before\{display:none\}/);
  assert.match(css, /\.public-wedding-page \.theme-elegant \.cover-photo::after\{background:linear-gradient\(90deg,rgba\(20,26,20,\.52\)/);
});

test('ART-001: hoạ tiết thuần trang trí không chặn click', () => {
  assert.match(declarations('.wedding-ornament'), /pointer-events:none/);
  assert.match(declarations('.wedding-rule'), /pointer-events:none/);
});

test('ART-001: mẫu chuẩn vẫn tôn trọng prefers-reduced-motion', () => {
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\.theme-elegant \.cover-photo img\{animation:none/);
});

test('TYPO-001: serif cho tên và tiêu đề, sans cho nội dung và form', () => {
  assert.match(declarations('.wedding-cover h1'), /font-family:var\(--inv-serif/);
  assert.match(declarations('.section-intro h2,.wedding-story h2,.wedding-album h2'), /font-family:var\(--inv-serif/);
  assert.match(declarations('.event-content h2'), /font-family:var\(--inv-serif/);
  assert.match(declarations('.wedding-message'), /font-family:var\(--inv-sans/);
  assert.match(declarations('.story-copy'), /font-family:var\(--inv-sans/);
  assert.match(declarations('.cover-caption'), /font-family:var\(--inv-sans/);
  assert.match(declarations('.eyebrow'), /font-family:var\(--inv-sans/);
});

test('TYPO-001: không dùng font viết tay cho đoạn văn hay ngày giờ', () => {
  assert.doesNotMatch(css, /cursive|Brush Script|Dancing Script|Great Vibes/i);
});

test('TYPO-001: câu tiếng Việt không bị letter-spacing làm tách dấu', () => {
  const sentenceText = ['.wedding-message', '.story-copy', '.event-note', '.wish-item p', '.wish-mine p', '.wedding-thanks p', '.event-place span', '.couple-names', '.recipient-name'];
  for (const selector of sentenceText) {
    const tracking = declarations(selector).match(/letter-spacing:([^;}]+)/);
    assert.ok(tracking, `${selector} phải khai báo letter-spacing tường minh`);
    assert.equal(tracking[1].trim(), 'normal', `${selector} đang dùng letter-spacing:${tracking[1]}`);
  }
});

test('TYPO-001: nội dung chính không nhỏ hơn 16px ở khung hẹp', () => {
  for (const selector of ['.wedding-message', '.story-copy', '.wish-item p']) {
    const sizes = fontSizes(selector);
    assert.ok(sizes.length > 0, `${selector} phải khai báo font-size`);
    const smallest = Math.min(...sizes);
    assert.ok(smallest >= 16, `${selector} có font-size ${smallest}px, nhỏ hơn 16px`);
  }
  // Thông tin phụ trong card buổi tiệc vẫn đủ đọc trên mobile.
  assert.ok(Math.min(...fontSizes('.event-place span')) >= 15, 'Địa chỉ buổi tiệc quá nhỏ');
  assert.ok(Math.min(...fontSizes('.event-note')) >= 15, 'Ghi chú buổi tiệc quá nhỏ');
});