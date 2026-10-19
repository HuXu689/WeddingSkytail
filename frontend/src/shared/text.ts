/**
 * Helpers cho văn bản tiếng Việt do người dùng nhập, dùng chung cho thiệp khách,
 * sổ lời chúc và trình xem trước của quản trị.
 *
 * Vì sao cần:
 * - NFC giữ dấu tiếng Việt ở dạng một code point ("ầ" = U+1EA7) thay vì dấu rời
 *   ("a" + U+0302 + U+0300). Dạng dấu rời bị tách khỏi chữ khi có letter-spacing,
 *   khi in PDF hoặc khi gửi qua Zalo/Messenger.
 * - Một số trình soạn thảo gửi chuỗi "\n" dạng ký tự (backslash + n) thay vì
 *   xuống dòng thật; ở đây chúng được đổi để khách không bao giờ thấy "\n" trên thiệp.
 */

/** NFC cho mọi chuỗi; null/undefined trở thành chuỗi rỗng. */
export function nfc(value: string | null | undefined): string {
  return (value ?? '').normalize('NFC');
}

/** Văn bản nhiều dòng: literal \r\n / \r / \n và CRLF/CR thật đều thành "\n". */
export function text(value: string | null | undefined): string {
  const literal = (value ?? '').replace(/\\r\\n|\\r|\\n/g, '\n');
  return nfc(literal).replace(/\r\n?/g, '\n');
}

/** Tách thành các đoạn theo dòng trống, giữ nguyên hành vi cũ của thiệp. */
export function paragraphs(value: string | null | undefined): string[] {
  return text(value).split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
}

/** Văn bản một dòng cho tên, địa chỉ, nhãn: mọi xuống dòng thành khoảng trắng. */
export function oneLine(value: string | null | undefined): string {
  return text(value).replace(/\s*\n+\s*/g, ' ').trim();
}

/** Dấu phân cách tên cặp đôi thường dùng trong thiệp Việt Nam. */
const NAME_SEPARATOR = /\s*(?:&|＆)\s*|\s+và\s+|\s+Và\s+/;

/**
 * Tách "Trần Thị Thu Hà & Nguyễn Văn An" thành từng tên.
 * Không tách từng code point: giữ mỗi tên nguyên vẹn để dấu tiếng Việt không bị hỏng.
 */
export function coupleNames(value: string | null | undefined): string[] {
  const line = oneLine(value);
  const parts = line.split(NAME_SEPARATOR).map(part => part.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [line];
}