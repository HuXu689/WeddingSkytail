package vn.wedding.invitation.common;

import java.text.Normalizer;

/**
 * Chuẩn hoá văn bản do người dùng nhập, dùng chung cho mọi đường ghi dữ liệu
 * (thiết kế, khách mời, buổi tiệc, RSVP, lời chúc).
 *
 * <p>Vì sao cần: tiếng Việt có thể được lưu ở dạng tổ hợp (NFD, ví dụ "ầ" = a + U+0302 + U+0300)
 * hoặc ở dạng dựng sẵn (NFC, "ầ" = U+1EA7). NFD làm dấu tách khỏi chữ khi hiển thị,
 * khi in PDF hoặc khi gửi qua Zalo/Messenger. Chuẩn hoá NFC ở biên ghi dữ liệu
 * khiến phần còn lại của hệ thống chỉ phải xử lý một dạng duy nhất.
 */
public final class Texts {
    private Texts() {}

    /** NFC, giữ nguyên mọi ký tự khác. Chuỗi null trở thành chuỗi rỗng. */
    public static String nfc(String value) {
        return value == null ? "" : Normalizer.normalize(value, Normalizer.Form.NFC);
    }

    /**
     * NFC cho văn bản nhiều dòng. Một số trình soạn thảo gửi chuỗi "\n"/"\r\n" dạng ký tự
     * (backslash + n) thay vì xuống dòng thật; ở đây chúng được đổi thành xuống dòng thật,
     * và CRLF/CR thật cũng được gom về "\n".
     */
    public static String text(String value) {
        if (value == null) return "";
        String literal = value.replace("\\r\\n", "\n").replace("\\r", "\n").replace("\\n", "\n");
        return nfc(literal).replace("\r\n", "\n").replace('\r', '\n');
    }

    /** Văn bản một dòng cho tên, địa chỉ, nhãn: mọi xuống dòng trở thành khoảng trắng. */
    public static String oneLine(String value) {
        return text(value).replaceAll("\\s*\\n+\\s*", " ").trim();
    }
}