package vn.wedding.invitation;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/**
 * RSVP-001: câu SELECT của thiệp khách từng chọn cả {@code e.note} (ghi chú của chủ tiệc)
 * và {@code r.note} (lời nhắn riêng của khách) với cùng nhãn {@code note}.
 * JdbcTemplate trả Map theo nhãn cột nên hai giá trị ghi đè nhau: card công khai và
 * ô lời nhắn RSVP dùng chung một trường — hoặc lộ ghi chú nội bộ, hoặc lộ lời nhắn riêng.
 * Test này khoá lại quy tắc: mỗi cột phải có nhãn riêng.
 */
class GuestPayloadTest {
    @Test void guestEventPayloadNeverLabelsTwoColumnsTheSameWay() throws Exception {
        Path source=Path.of("src","main","java","vn","wedding","invitation","invitations","GuestService.java");
        assertTrue(Files.exists(source),"Không tìm thấy GuestService.java (phải chạy test từ thư mục backend)");
        String code=Files.readString(source);
        Matcher select=Pattern.compile("SELECT ([^\"]+?) FROM assignments a JOIN events e",Pattern.DOTALL).matcher(code);
        String projection=null;
        while(select.find()) {
            if(select.group(1).contains("r.status")) { projection=select.group(1); break; }
        }
        assertNotNull(projection,"Không đọc được câu SELECT có join bảng responses");

        assertTrue(projection.contains("e.note AS event_note"),"Ghi chú sự kiện phải có nhãn riêng: "+projection);
        assertTrue(projection.contains("r.note AS note"),"Lời nhắn riêng của khách phải là `note`: "+projection);

        long unaliased=Arrays.stream(projection.split(","))
            .map(String::trim)
            .filter(part->part.endsWith(".note"))
            .count();
        assertEquals(0,unaliased,"Còn cột note không alias tường minh trong: "+projection);
    }
}