import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

/**
 * TOK-001: design tokens phải nằm ở một nơi khai báo duy nhất, và màu trạng thái
 * phải tách khỏi màu thương hiệu — đổi theme sang đỏ không được làm "thành công" thành màu đỏ.
 */
const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');

function token(name) {
  const match = css.match(new RegExp(`--${name}:([^;]+);`));
  return match ? match[1].trim() : null;
}

test('globals.css khai báo đủ nhóm design token', () => {
  const required = [
    'bg-page', 'bg-surface', 'bg-surface-soft', 'bg-subtle',
    'text-primary', 'text-secondary', 'brand-primary', 'brand-primary-strong', 'brand-soft', 'brand-border',
    'status-success-fg', 'status-success-bg', 'status-error-fg', 'status-error-bg', 'status-warning-fg', 'status-warning-bg',
    'font-heading', 'font-body', 'font-serif', 'radius-sm', 'radius-pill', 'shadow-card', 'content-narrow',
    'content-invitation', 'content-main', 'motion-fast', 'motion-ease'
  ];
  for (const name of required) assert.ok(token(name), `Thiếu design token --${name}`);
  for (const step of [1, 2, 3, 4, 5, 6, 7, 8]) assert.ok(token(`space-${step}`), `Thiếu token --space-${step}`);
});

test('màu trạng thái không dùng lại màu thương hiệu', () => {
  const brand = token('brand-primary');
  assert.ok(brand);
  for (const status of ['status-success-fg', 'status-error-fg', 'status-warning-fg']) {
    assert.notEqual(token(status), brand, `${status} trùng màu thương hiệu`);
  }
  const values = ['status-success-fg', 'status-error-fg', 'status-warning-fg'].map(token);
  assert.equal(new Set(values).size, values.length, 'Ba trạng thái phải có ba màu khác nhau');
});

test('bề rộng nội dung dùng token thay vì số rời', () => {
  assert.match(css, /\.narrow \{ max-width:var\(--content-narrow\); \}/);
});