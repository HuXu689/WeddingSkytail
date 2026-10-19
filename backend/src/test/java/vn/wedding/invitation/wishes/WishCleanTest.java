package vn.wedding.invitation.wishes;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/** T24: sanitising guest-written content is security relevant, so the rule itself is unit tested. */
class WishCleanTest {
    @Test void stripsControlCharactersButKeepsParagraphBreaks() {
        assertEquals("Chúc mừng hai bạn",WishService.clean("Chúc\u0000 mừng\u0007 hai bạn"));
        assertEquals("Dòng một\nDòng hai",WishService.clean("Dòng một\nDòng hai"));
        assertEquals("Dòng một\n\nDòng hai",WishService.clean("Dòng một\n\n\n\nDòng hai"));
    }
    @Test void normalisesWhitespaceAndLineEndings() {
        assertEquals("a b c",WishService.clean("  a   b\t\tc  "));
        assertEquals("Chúc mừng",WishService.clean("Chúc mừng\r\n"));
        assertEquals("một\nhai",WishService.clean("một\r\nhai"));
    }
    @Test void keepsVietnameseAndEmojiIntact() {
        assertEquals("Chúc mừng hạnh phúc 🎉",WishService.clean("Chúc mừng hạnh phúc 🎉"));
        assertEquals("Trăm năm hạnh phúc",WishService.clean("Trăm năm hạnh phúc"));
    }
    @Test void nullBecomesEmptyText() {
        assertEquals("",WishService.clean(null));
    }
}