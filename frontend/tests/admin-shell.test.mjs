import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isActiveRoute} from '../src/shared/routes.ts';

/**
 * UI-002: mỗi mục menu chỉ được xuất hiện một lần và mục đang mở phải sáng đúng.
 * Lỗi "sidebar lặp mục" trong ảnh chụp được nghi là artefact của công cụ chụp cuộn (sidebar sticky),
 * nên thay vì đổi giao diện, ở đây khoá lại bằng test chống trùng thật trên dữ liệu menu.
 */
const shell = fs.readFileSync(new URL('../src/features/admin/shell.tsx', import.meta.url), 'utf8');

function navigationItems() {
  const block = shell.match(/const navigation=(\[[\s\S]*?\]);/);
  assert.ok(block, 'Không tìm thấy mảng navigation trong shell.tsx');
  return [...block[1].matchAll(/\[('[^']*'),('[^']*'),('[^']*'),('[^']*')\]/g)]
    .map(match => ({
      href: match[1].slice(1, -1),
      title: match[2].slice(1, -1),
      icon: match[3].slice(1, -1),
      ownerOnly: match[4].slice(1, -1)
    }));
}

test('menu quản trị không lặp href và không lặp nhãn', () => {
  const items = navigationItems();
  assert.ok(items.length >= 10, `Mong đợi danh sách menu đầy đủ, chỉ thấy ${items.length} mục`);
  const hrefs = items.map(item => item.href);
  const titles = items.map(item => item.title);
  assert.equal(new Set(hrefs).size, hrefs.length, `Trùng href trong menu: ${hrefs.join(', ')}`);
  assert.equal(new Set(titles).size, titles.length, `Trùng nhãn trong menu: ${titles.join(', ')}`);
  for (const item of items) {
    assert.ok(item.href.startsWith('/admin'), `Mục menu phải nằm dưới /admin: ${item.href}`);
    assert.ok(item.icon.length > 0, `Mục ${item.href} thiếu icon`);
  }
});

test('menu chỉ ẩn/hiện theo vai trò OWNER, không có cờ lạ', () => {
  assert.match(shell, /ownerOnly!=='OWNER'/);
  for (const item of navigationItems()) {
    assert.ok(item.ownerOnly === '' || item.ownerOnly === 'OWNER', `Cờ quyền lạ ở ${item.href}: ${item.ownerOnly}`);
  }
});

test('isActiveRoute sáng đúng mục menu, /admin không sáng ở mọi trang con', () => {
  assert.equal(isActiveRoute('/admin', '/admin'), true);
  const nested = ['/admin/wedding', '/admin/media', '/admin/invitations', '/admin/responses'];
  for (const href of nested) {
    assert.equal(isActiveRoute('/admin', href), false, `${href} không được sáng mục Tổng quan`);
  }
  assert.equal(isActiveRoute('/admin/invitations', '/admin/invitations'), true);
  assert.equal(isActiveRoute('/admin/invitations/bulk-policy', '/admin/invitations'), true);
  assert.equal(isActiveRoute('/admin/media', '/admin/invitations'), false);
  assert.equal(isActiveRoute('/admin/wedding/extra', '/admin/wedding'), true);
  assert.equal(isActiveRoute('/admin/account', '/admin/account'), true);
});