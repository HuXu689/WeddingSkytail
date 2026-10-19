package vn.wedding.invitation;

import org.junit.jupiter.api.Test;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import vn.wedding.invitation.invitations.CalendarFile;
import static org.junit.jupiter.api.Assertions.*;

class CalendarFileTest {
    private static final Instant NOW=Instant.parse("2027-01-01T00:00:00Z");
    private static final Instant START=Instant.parse("2027-03-14T02:30:00Z");
    private static CalendarFile.Event event(String state,String notice,String maps) {
        return new CalendarFile.Event("9f1c-42","Tiệc cưới nhà An",START,"Asia/Ho_Chi_Minh","Tư gia nhà gái","12 Lê Lợi, Quận 1",maps,notice,state);
    }
    @Test void calendarIsUtcAndCarriesAStableUid() {
        String calendar=CalendarFile.build(event("PUBLISHED",null,"https://maps.google.com/?q=12"),NOW);
        assertTrue(calendar.startsWith("BEGIN:VCALENDAR\r\n"));
        assertTrue(calendar.endsWith("END:VCALENDAR\r\n"));
        assertTrue(calendar.contains("UID:9f1c-42\r\n"),"UID phải ổn định để khách cập nhật chứ không thêm trùng");
        assertTrue(calendar.contains("DTSTART:20270314T023000Z\r\n"));
        assertTrue(calendar.contains("DTEND:20270314T053000Z\r\n"));
        assertTrue(calendar.contains("DTSTAMP:20270101T000000Z\r\n"));
        assertTrue(calendar.contains("X-WR-TIMEZONE:Asia/Ho_Chi_Minh\r\n"));
        assertFalse(calendar.contains("CANCELLED"));
    }
    @Test void calendarEscapesTextAndMarksCancelledEvents() {
        String calendar=CalendarFile.build(event("CANCELLED","Dời sang 20 giờ; sảnh B","https://maps.google.com/?q=12"),NOW);
        assertTrue(calendar.contains("SUMMARY:Tiệc cưới: Tiệc cưới nhà An\r\n"));
        assertTrue(calendar.contains("STATUS:CANCELLED"));
        // DESCRIPTION is longer than 75 octets, so compare against the unfolded text.
        String unfolded=calendar.replace("\r\n ","");
        assertTrue(unfolded.contains("Lưu ý mới: Dời sang 20 giờ\\; sảnh B."),"Dấu chấm phẩy trong ICS phải được thoát");
        assertTrue(unfolded.contains("Bản đồ: https://maps.google.com/?q=12."));
    }
    @Test void commaAndBackslashAreEscaped() {
        CalendarFile.Event tricky=new CalendarFile.Event("id-2","Lễ, tiệc \\ thân mật",START,"Asia/Ho_Chi_Minh","Nhà hàng","Số 5, đường Lê Lợi",null,null,"PUBLISHED");
        String calendar=CalendarFile.build(tricky,NOW);
        assertTrue(calendar.contains("SUMMARY:Tiệc cưới: Lễ\\, tiệc \\\\ thân mật\r\n"));
        assertTrue(calendar.contains("LOCATION:Nhà hàng\\, Số 5\\, đường Lê Lợi\r\n"));
    }
    @Test void everyLineStaysInsideSeventyFiveOctets() {
        CalendarFile.Event longEvent=new CalendarFile.Event("id-3","Tiệc cưới của gia đình ".repeat(8),START,"Asia/Ho_Chi_Minh","Nhà hàng tiệc cưới","Địa chỉ rất dài ".repeat(12),null,null,"PUBLISHED");
        String calendar=CalendarFile.build(longEvent,NOW);
        for(String line:calendar.split("\r\n")) assertTrue(line.getBytes(StandardCharsets.UTF_8).length<=75,"Dòng ICS vượt 75 octet: "+line);
        assertTrue(calendar.contains("\r\n "),"Dòng dài phải được gấp bằng dấu cách đầu dòng");
    }
    @Test void missingOptionalDetailsDoNotBreakTheFile() {
        CalendarFile.Event minimal=new CalendarFile.Event("id-4","Lễ vu quy",START,"",null,null,null,null,"PUBLISHED");
        String calendar=CalendarFile.build(minimal,NOW);
        assertFalse(calendar.contains("LOCATION:"));
        assertFalse(calendar.contains("URL:"));
        assertTrue(calendar.contains("SUMMARY:Tiệc cưới: Lễ vu quy\r\n"));
    }
}