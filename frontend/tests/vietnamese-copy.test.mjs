import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const sourceRoot = path.resolve('src');
const sourceFiles = [];
function collect(directory) {
  for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (/\.(tsx?|css)$/.test(entry.name)) sourceFiles.push(full);
  }
}
collect(sourceRoot);
const source = sourceFiles.map(file => fs.readFileSync(file,'utf8')).join('\n');

test('giao diện không chứa các nhãn tiếng Anh hoặc dữ liệu giả không dấu phổ biến', () => {
  const forbidden = [
    'Save the date', 'Wedding studio', 'Draft design', 'Published design', 'Stable link reveal',
    'Smoke test', 'Test venue', 'Test address', 'Guest cannot access admin', 'Kinh moi',
    'Cam on ban', 'Cau chuyen thu nghiem', 'Du lieu gia de kiem thu', 'Gia dinh test'
  ];
  for (const phrase of forbidden) assert.equal(source.includes(phrase), false, `Còn chuỗi giao diện chưa Việt hóa: ${phrase}`);
});

test('giao diện có ngôn ngữ tiếng Việt', () => {
  for (const phrase of ['Đăng nhập','Thiệp cưới','Buổi tiệc','Khách & lời mời','Phản hồi','Nhật ký','Mở thiệp']) {
    assert.equal(source.includes(phrase), true, `Thiếu chuỗi tiếng Việt bắt buộc: ${phrase}`);
  }
});

test('giao diện quản trị có nền tảng responsive và accessibility', () => {
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /@media\(max-width:380px\)/);
  assert.match(source, /\.sr-only/);
  for (const phrase of ['/admin/exports','Tạo PDF A4','Lịch sử','Lý do chỉnh sửa bắt buộc']) {
    assert.equal(source.includes(phrase), true, `Thiếu thành phần nghiệm thu: ${phrase}`);
  }
});