package vn.wedding.invitation.invitations;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * ICS (RFC 5545) rendering for one invited event (P1).
 * Pure text so it can be unit tested; the caller has already passed the access gate, the open marker and the PIN.
 */
public final class CalendarFile {
    /** events have no end time, so a wedding-typical duration is used instead of inventing one per event. */
    public static final long DURATION_HOURS=3;
    private static final DateTimeFormatter UTC=DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);
    private CalendarFile() {}
    public record Event(String uid,String title,Instant start,String timezone,String venue,String address,String mapsUrl,String changeNotice,String state) {}
    public static String build(Event event,Instant now) {
        StringBuilder body=new StringBuilder();
        body.append("BEGIN:VCALENDAR\r\n").append("VERSION:2.0\r\n").append("PRODID:-//Ngay chung doi//Thiep cuoi//VI\r\n").append("CALSCALE:GREGORIAN\r\n").append("METHOD:PUBLISH\r\n").append("BEGIN:VEVENT\r\n");
        body.append(fold("UID:"+event.uid()+"\r\n"));
        body.append("DTSTAMP:").append(UTC.format(now)).append("\r\n");
        body.append("DTSTART:").append(UTC.format(event.start())).append("\r\n");
        body.append("DTEND:").append(UTC.format(event.start().plusSeconds(DURATION_HOURS*3600))).append("\r\n");
        body.append(fold("SUMMARY:"+escape("Tiệc cưới: "+event.title())+"\r\n"));
        String location=join(event.venue(),event.address());
        if(!location.isEmpty()) body.append(fold("LOCATION:"+escape(location)+"\r\n"));
        body.append(fold("DESCRIPTION:"+escape(description(event))+"\r\n"));
        if(event.mapsUrl()!=null && !event.mapsUrl().isBlank()) body.append(fold("URL:"+escape(event.mapsUrl())+"\r\n"));
        if(!event.timezone().isBlank()) body.append(fold("X-WR-TIMEZONE:"+escape(event.timezone())+"\r\n"));
        if("CANCELLED".equals(event.state())) body.append("STATUS:CANCELLED\r\n");
        body.append("END:VEVENT\r\n").append("END:VCALENDAR\r\n");
        return body.toString();
    }
    private static String description(Event event) {
        StringBuilder text=new StringBuilder("Buổi tiệc trong thiệp cưới của chúng mình.");
        if(event.changeNotice()!=null && !event.changeNotice().isBlank()) text.append(" Lưu ý mới: ").append(event.changeNotice().trim()).append('.');
        if(event.mapsUrl()!=null && !event.mapsUrl().isBlank()) text.append(" Bản đồ: ").append(event.mapsUrl().trim()).append('.');
        if("CANCELLED".equals(event.state())) text.append(" Buổi tiệc này đã được hủy.");
        return text.toString();
    }
    private static String join(String first,String second) {
        String left=first==null?"":first.trim(); String right=second==null?"":second.trim();
        if(left.isEmpty()) return right; if(right.isEmpty()) return left; return left+", "+right;
    }
    /** RFC 5545 TEXT escaping: backslash, semicolon, comma and line breaks. */
    static String escape(String value) {
        if(value==null) return "";
        return value.replace("\\","\\\\").replace(";","\\;").replace(",","\\,").replace("\r\n","\\n").replace("\n","\\n").replace("\r","\\n");
    }
    /** Content lines must stay inside 75 octets; Vietnamese text is multi-byte so folding counts UTF-8 bytes. */
    static String fold(String line) {
        StringBuilder out=new StringBuilder(); int bytes=0; int limit=73;
        int end=line.endsWith("\r\n")?line.length()-2:line.length();
        for(int i=0;i<end;i++) {
            char character=line.charAt(i);
            int size=String.valueOf(character).getBytes(StandardCharsets.UTF_8).length;
            if(bytes+size>limit) { out.append("\r\n "); bytes=1; limit=73; }
            out.append(character); bytes+=size;
        }
        return out.append("\r\n").toString();
    }
}