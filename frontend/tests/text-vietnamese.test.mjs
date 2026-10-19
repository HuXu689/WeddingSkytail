import test from 'node:test';
import assert from 'node:assert/strict';
import {coupleNames,nfc,oneLine,paragraphs,text} from '../src/shared/text.ts';

/**
 * UI-001 / UI-006: dữ liệu tiếng Việt phải được chuẩn hoá NFC và literal \n phải thành xuống dòng thật,
 * nếu không dấu sẽ tách khỏi chữ khi hiển thị / in PDF, và khách sẽ thấy ký tự "\n" trên thiệp.
 */

// "Trần" ở dạng tổ hợp: T, r, a, U+0302 (dấu mũ), U+0300 (dấu huyền), n.
const NFD = 'Tra\u0302\u0300n';
const NFC = 'Trần';
const COMBINING = /[\u0300-\u036f]/;

test('nfc giữ dấu tiếng Việt ở dạng một code point', () => {
  assert.equal(nfc(NFD), NFC);
  assert.equal(nfc(NFD).length, 4, 'NFC phải là T-r-ầ-n (4 code point), không phải 6');
  assert.equal(COMBINING.test(nfc(NFD)), false, 'Không còn dấu tổ hợp sau khi chuẩn hoá');
  assert.equal(nfc(NFC), NFC, 'Chuỗi đã NFC phải giữ nguyên');
  assert.equal(nfc(undefined), '');
});

test('nfc không đổi chữ hoa/thường hay nội dung khác', () => {
  assert.equal(nfc('TRẦN THỊ THU HÀ'), 'TRẦN THỊ THU HÀ');
  assert.equal(nfc('Chị Mai'), 'Chị Mai');
  assert.equal(nfc('Nguyễn Huệ, Quận 1'), 'Nguyễn Huệ, Quận 1');
});

test('text đổi literal \\r\\n, \\r, \\n và CRLF thật thành một xuống dòng', () => {
  assert.equal(text('Dòng một\\nDòng hai'), 'Dòng một\nDòng hai');
  assert.equal(text('Dòng một\\r\\nDòng hai'), 'Dòng một\nDòng hai');
  assert.equal(text('Dòng một\\rDòng hai'), 'Dòng một\nDòng hai');
  assert.equal(text('Dòng một\r\nDòng hai'), 'Dòng một\nDòng hai');
  assert.equal(text('Dòng một\rDòng hai'), 'Dòng một\nDòng hai');
});

test('text chuẩn hoá NFC cho cả văn bản nhiều dòng', () => {
  assert.equal(COMBINING.test(text(`${NFD}\\n${NFD}`)), false);
  assert.equal(text(`${NFD}\\n${NFD}`), `${NFC}\n${NFC}`);
});

test('oneLine gom xuống dòng thành khoảng trắng cho tên và địa chỉ', () => {
  assert.equal(oneLine('88 Trần Phú\\nHải Châu'), '88 Trần Phú Hải Châu');
  assert.equal(oneLine('  Chị Mai  '), 'Chị Mai');
  assert.equal(oneLine('Trần Phú\r\nĐà Nẵng'), 'Trần Phú Đà Nẵng');
});

test('paragraphs tách theo dòng trống và không trả đoạn rỗng', () => {
  assert.deepEqual(paragraphs('Một\\n\\nHai'), ['Một', 'Hai']);
  assert.deepEqual(paragraphs('  Một  \n\n\n\n  Hai  '), ['Một', 'Hai']);
  assert.deepEqual(paragraphs(''), []);
});

test('coupleNames tách hai tên nhưng không tách từng code point', () => {
  assert.deepEqual(coupleNames('Trần Thị Thu Hà & Nguyễn Văn An'), ['Trần Thị Thu Hà', 'Nguyễn Văn An']);
  assert.deepEqual(coupleNames('Minh & An'), ['Minh', 'An']);
  assert.deepEqual(coupleNames('Lan và Huy'), ['Lan', 'Huy']);
  assert.deepEqual(coupleNames('Lan Và Huy'), ['Lan', 'Huy']);
  assert.deepEqual(coupleNames('Tên hai bạn'), ['Tên hai bạn']);
});

test('coupleNames trả về tên đã NFC và không làm mất dấu', () => {
  const parts = coupleNames(`${NFD} & An`);
  assert.deepEqual(parts, [NFC, 'An']);
  for (const part of parts) {
    assert.equal(COMBINING.test(part), false, `Tên "${part}" còn dấu tổ hợp`);
    assert.ok(part.length > 0);
  }
});

test('coupleNames không tách một tên đơn có chữ "và" bên trong từ khác', () => {
  assert.deepEqual(coupleNames('Nguyễn Văn An'), ['Nguyễn Văn An']);
  assert.deepEqual(coupleNames('Trần Văn Khánh'), ['Trần Văn Khánh']);
});