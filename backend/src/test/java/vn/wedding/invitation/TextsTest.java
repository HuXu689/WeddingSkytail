package vn.wedding.invitation;

import java.text.Normalizer;
import org.junit.jupiter.api.Test;
import vn.wedding.invitation.common.Texts;
import static org.junit.jupiter.api.Assertions.*;

/**
 * UI-001 / UI-006: chuẩn hoá tiếng Việt ở biên ghi dữ liệu.
 * "Trần" ở dạng tổ hợp (NFD) làm dấu tách khỏi chữ khi hiển thị, in PDF hoặc gửi qua Zalo/Messenger.
 */
class TextsTest {
    /** "Trần" dạng rời dấu: T, r, a, U+0302 (mũ), U+0300 (huyền), n. */
    private static final String NFD="Tra\u0302\u0300n";
    private static final String NFC="Trần";

    private static boolean isDecomposed(String value) {
        return !value.equals(Normalizer.normalize(value,Normalizer.Form.NFC));
    }

    @Test void keepsVietnameseDiacriticsAsOneCodePoint() {
        assertEquals(NFC,Texts.nfc(NFD));
        assertEquals(4,Texts.nfc(NFD).length(),"NFC phải là T-r-ầ-n (4 code point)");
        assertFalse(isDecomposed(Texts.nfc(NFD)),"Không còn dấu tổ hợp sau khi chuẩn hoá");
        assertEquals(NFC,Texts.nfc(NFC),"Chuỗi đã NFC phải giữ nguyên");
        assertEquals("",Texts.nfc(null));
    }

    @Test void doesNotChangeCaseOrPlainText() {
        assertEquals("TRẦN THỊ THU HÀ",Texts.nfc("TRẦN THỊ THU HÀ"));
        assertEquals("Nguyễn Huệ, Quận 1",Texts.nfc("Nguyễn Huệ, Quận 1"));
    }

    @Test void turnsLiteralEscapesAndRealLineEndingsIntoOneNewline() {
        assertEquals("Dòng một\nDòng hai",Texts.text("Dòng một\\nDòng hai"));
        assertEquals("Dòng một\nDòng hai",Texts.text("Dòng một\\r\\nDòng hai"));
        assertEquals("Dòng một\nDòng hai",Texts.text("Dòng một\\rDòng hai"));
        assertEquals("Dòng một\nDòng hai",Texts.text("Dòng một\r\nDòng hai"));
        assertEquals("Dòng một\nDòng hai",Texts.text("Dòng một\rDòng hai"));
    }

    @Test void normalisesNfcInsideMultiLineText() {
        assertEquals(NFC+"\n"+NFC,Texts.text(NFD+"\\n"+NFD));
        assertFalse(isDecomposed(Texts.text(NFD+"\n"+NFD)));
    }

    @Test void oneLineCollapsesBreaksForNamesAndAddresses() {
        assertEquals("88 Trần Phú Hải Châu",Texts.oneLine("88 Trần Phú\\nHải Châu"));
        assertEquals("Chị Mai",Texts.oneLine("  Chị Mai  "));
        assertEquals("Trần Phú Đà Nẵng",Texts.oneLine("Trần Phú\r\nĐà Nẵng"));
    }
}