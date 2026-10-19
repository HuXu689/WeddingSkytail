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

test('đợt 3 có trung tâm in, thao tác truy cập hàng loạt và báo cáo', () => {
  for (const phrase of ['Trung tâm in','Xem trước và tạo bản in','Tải báo cáo khách','Tải báo cáo phản hồi','/admin/invitations/bulk-policy','Xem trước ảnh hưởng','không đổi link hay QR của khách']) {
    assert.equal(source.includes(phrase), true, `Thiếu thành phần nghiệm thu đợt 3: ${phrase}`);
  }
  assert.match(source, /\.print-sheet/);
  assert.match(source, /\.print-label-qr/);
});

test('thiệp khách có thay đổi buổi tiệc, đường đi và tiến độ phản hồi', () => {
  // Đọc riêng trang thiệp khách: các chuỗi này cũng có ở màn quản trị nên kiểm tra trên toàn bộ source sẽ không đủ chặt.
  const guest = fs.readFileSync(path.join(sourceRoot,'app','invitation','[id]','page.tsx'),'utf8');
  for (const phrase of ['Buổi tiệc vừa được cập nhật','Xem đường đi','Trang phục','Chỗ đỗ xe','Phản hồi của bạn','Đã phản hồi']) {
    assert.equal(guest.includes(phrase), true, `Thiếu thành phần thiệp khách: ${phrase}`);
  }
});

test('PIN bảo vệ lời mời có bước nhập riêng ở thiệp khách và phần quản lý ở trang khách mời', () => {
  const guest = fs.readFileSync(path.join(sourceRoot,'app','invitation','[id]','page.tsx'),'utf8');
  for (const phrase of ['Nhập mã PIN để mở thiệp','Bảo vệ bằng mã PIN','Mã PIN không đúng','type="password"']) {
    assert.equal(guest.includes(phrase), true, `Thiếu bước PIN ở thiệp khách: ${phrase}`);
  }
  const admin = fs.readFileSync(path.join(sourceRoot,'features','admin','pin-panel.tsx'),'utf8');
  for (const phrase of ['Mã PIN bảo vệ lời mời','Bật PIN (máy chủ tạo mã)','Tạo mã PIN mới','Tắt PIN','chỉ hiển thị một lần']) {
    assert.equal(admin.includes(phrase), true, `Thiếu phần quản lý PIN: ${phrase}`);
  }
  assert.equal(admin.includes('localStorage'), false, 'Không lưu mã PIN hay trạng thái xác nhận ở trình duyệt');
});

test('worklist nhắc RSVP, tệp lịch, nhạc nền và đếm ngược có đủ thành phần', () => {
  const reminders = fs.readFileSync(path.join(sourceRoot,'app','admin','reminders','page.tsx'),'utf8');
  for (const phrase of ['Nhắc khách chưa phản hồi','Chưa ghi nhận mở thiệp','Đã mở nhưng chưa phản hồi','Đánh dấu đã nhắc','Bỏ ghi nhận nhắc','website không tự động gửi']) {
    assert.equal(reminders.includes(phrase), true, `Thiếu thành phần worklist nhắc: ${phrase}`);
  }
  const guest = fs.readFileSync(path.join(sourceRoot,'app','invitation','[id]','page.tsx'),'utf8');
  for (const phrase of ['Thêm vào lịch','/calendar.ics']) {
    assert.equal(guest.includes(phrase), true, `Thiếu tệp lịch ở thiệp khách: ${phrase}`);
  }
  const canvas = fs.readFileSync(path.join(sourceRoot,'features','invitation','design.tsx'),'utf8');
  for (const phrase of ['Bật nhạc nền','Tắt nhạc nền','preload="none"','Đếm ngược','Còn ${days} ngày nữa']) {
    assert.equal(canvas.includes(phrase), true, `Thiếu thành phần nhạc/đếm ngược: ${phrase}`);
  }
  assert.equal(canvas.includes('autoPlay'), false, 'Nhạc nền không được tự động phát');
  const media = fs.readFileSync(path.join(sourceRoot,'app','admin','media','page.tsx'),'utf8');
  for (const phrase of ['Nhạc nền cho thiệp','/admin/media/audio','audio/mpeg']) {
    assert.equal(media.includes(phrase), true, `Thiếu tải nhạc ở thư viện: ${phrase}`);
  }
  const editor = fs.readFileSync(path.join(sourceRoot,'features','admin','design-editor.tsx'),'utf8');
  for (const phrase of ['Nhạc nền và đếm ngược','Không dùng nhạc nền','Hiển thị đếm ngược tới buổi tiệc gần nhất']) {
    assert.equal(editor.includes(phrase), true, `Thiếu mục chọn nhạc trong thiết kế: ${phrase}`);
  }
});

test('sổ lời chúc có duyệt có đủ thành phần ở thiệp khách và trang quản trị', () => {
  const book = fs.readFileSync(path.join(sourceRoot,'features','invitation','wish-book.tsx'),'utf8');
  for (const phrase of ['Sổ lời chúc','Gửi lời chúc','sau khi chủ tiệc duyệt','Xem lời chúc của bạn','Đang chờ duyệt']) {
    assert.equal(book.includes(phrase), true, `Thiếu thành phần sổ lời chúc: ${phrase}`);
  }
  const admin = fs.readFileSync(path.join(sourceRoot,'app','admin','wishes','page.tsx'),'utf8');
  for (const phrase of ['Hàng chờ duyệt','Chờ duyệt','Không hiển thị','Xóa lời chúc này?','mọi lời chúc đều ở trạng thái chờ duyệt']) {
    assert.equal(admin.includes(phrase), true, `Thiếu thành phần duyệt lời chúc: ${phrase}`);
  }
});

test('vai trò chủ tiệc và trợ lý nội dung có đủ thành phần quản trị', () => {
  const users = fs.readFileSync(path.join(sourceRoot,'app','admin','users','page.tsx'),'utf8');
  for (const phrase of ['Quản trị người dùng','Trợ lý nội dung','Tạo tài khoản','Đặt lại mật khẩu','Khóa tài khoản','Xóa tài khoản này?','ít nhất một chủ tiệc đang hoạt động']) {
    assert.equal(users.includes(phrase), true, `Thiếu thành phần quản trị người dùng: ${phrase}`);
  }
  const account = fs.readFileSync(path.join(sourceRoot,'app','admin','account','page.tsx'),'utf8');
  for (const phrase of ['Tài khoản của tôi','Vai trò của bạn','Đổi mật khẩu','Mật khẩu hiện tại','không được trùng mật khẩu cũ']) {
    assert.equal(account.includes(phrase), true, `Thiếu thành phần tài khoản: ${phrase}`);
  }
  const shell = fs.readFileSync(path.join(sourceRoot,'features','admin','shell.tsx'),'utf8');
  for (const phrase of ['/auth/me','/admin/users','/admin/account','role-badge','Trợ lý nội dung','ownerOnly']) {
    assert.equal(shell.includes(phrase), true, `Thiếu thành phần vai trò ở sidebar: ${phrase}`);
  }
});

test('card buổi tiệc không hiển thị số 0 vô nghĩa, dùng số thứ tự thật (L1)',()=>{
  const guest = fs.readFileSync(path.join(sourceRoot,'app','invitation','[id]','page.tsx'),'utf8');
  assert.equal(guest.includes("?'×':'0'"), false, 'Còn literal 0 hard-code ở card buổi tiệc');
  assert.match(guest,/publishedIndex\.get\(event\.id\)/);
  assert.match(guest,/className="sr-only"/);
});

test('ghi chú sự kiện tách khỏi lời nhắn riêng của khách (RSVP-001)',()=>{
  const guest = fs.readFileSync(path.join(sourceRoot,'app','invitation','[id]','page.tsx'),'utf8');
  // Card hiển thị ghi chú của chủ tiệc; textarea RSVP chỉ prefill lời nhắn của chính khách.
  assert.match(guest,/event\.event_note/);
  assert.match(guest,/\[note,setNote\]=useState\(text\(event\.note\|\|''\)\)/);
  assert.equal(guest.includes('{event.note&&'), false, 'Không được render lời nhắn riêng của khách ra thiệp');
});

test('nội dung hiển thị đi qua hàm chuẩn hoá dùng chung (UI-006)',()=>{
  const design = fs.readFileSync(path.join(sourceRoot,'features','invitation','design.tsx'),'utf8');
  assert.match(design,/from '@\/shared\/text'/);
  assert.match(design,/coupleNames\(/);
  assert.match(design,/oneLine\(/);
  const book = fs.readFileSync(path.join(sourceRoot,'features','invitation','wish-book.tsx'),'utf8');
  assert.match(book,/from '@\/shared\/text'/);
});