package vn.wedding.invitation.admin;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import jakarta.validation.constraints.Size;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.wedding.invitation.access.AccessGate;
import vn.wedding.invitation.common.ApiErrors;

/**
 * Reminder worklist (FR21 / docs/13 §10): the owner copies a ready-made Vietnamese message and marks
 * the contact by hand. Nothing is sent automatically, and "đã nhắc" stays completely separate from
 * the open-tracking data so a reminder is never mistaken for a guest opening the invitation.
 */
@Service
@Transactional
public class ReminderService {
    private final JdbcTemplate db;
    public ReminderService(JdbcTemplate db) { this.db=db; }
    private static final DateTimeFormatter HUMAN=DateTimeFormatter.ofPattern("HH:mm 'ngày' dd/MM/yyyy");
    private static final Set<String> FILTERS=Set.of("UNANSWERED","NO_OPEN","OPENED_NO_RESPONSE");
    /** Counted once per invited party, never per person, and never mixed with open tracking. */
    private static final String SCOPE="FROM assignments a JOIN invitations i ON i.id=a.invitation_id LEFT JOIN responses r ON r.invitation_id=i.id AND r.event_id=a.event_id LEFT JOIN invitation_reminders m ON m.invitation_id=i.id AND m.event_id=a.event_id WHERE a.event_id=? AND i.active AND NOT i.archived AND r.status IS NULL";
    private static final String OPENED="EXISTS (SELECT 1 FROM open_events o WHERE o.invitation_id=i.id)";
    public record Contact(@Size(max=500) String note) {}
    public Map<String,Object> worklist(UUID eventId,String filter) {
        String scope=filter==null||filter.isBlank()?"UNANSWERED":filter.toUpperCase(Locale.ROOT);
        ApiErrors.require(FILTERS.contains(scope),"Bộ lọc nhắc nhở không hợp lệ.");
        var events=db.queryForList("SELECT e.id,e.title,e.start_at,e.deadline,e.timezone FROM events e WHERE e.state='PUBLISHED' ORDER BY e.start_at");
        ApiErrors.require(!events.isEmpty(),"Chưa có buổi tiệc nào đã phát hành để nhắc khách.");
        Map<String,Object> event=events.getFirst();
        if(eventId!=null) event=events.stream().filter(row->row.get("id").equals(eventId)).findFirst().orElseThrow(ApiErrors::unavailable);
        String extra=switch(scope){case "NO_OPEN"->" AND NOT "+OPENED;case "OPENED_NO_RESPONSE"->" AND "+OPENED;default->"";};
        var rows=db.queryForList("SELECT i.id invitation_id,i.display_name,i.group_name,i.salutation,i.internal_note,(SELECT string_agg(e2.title,' · ' ORDER BY e2.start_at) FROM assignments a2 JOIN events e2 ON e2.id=a2.event_id WHERE a2.invitation_id=i.id AND e2.state<>'CANCELLED') assigned_events,(SELECT min(o.opened_at) FROM open_events o WHERE o.invitation_id=i.id) first_opened_at,(SELECT max(o.opened_at) FROM open_events o WHERE o.invitation_id=i.id) last_opened_at,(SELECT count(*) FROM open_events o WHERE o.invitation_id=i.id) open_count,m.contacted_at,m.contacted_by,m.note reminder_note "+SCOPE+extra+" ORDER BY i.display_name",event.get("id"));
        var counts=db.queryForMap("SELECT count(*) unanswered,count(*) FILTER (WHERE NOT "+OPENED+") no_open,count(*) FILTER (WHERE "+OPENED+") opened_no_response,count(*) FILTER (WHERE m.contacted_at IS NOT NULL) contacted "+SCOPE,event.get("id"));
        List<Map<String,Object>> result=new ArrayList<>();
        for(var row:rows) { Map<String,Object> item=new LinkedHashMap<>(row); item.put("message",message(row,event)); result.add(item); }
        Map<String,Object> answer=new LinkedHashMap<>();
        answer.put("event",event); answer.put("events",events); answer.put("filter",scope); answer.put("generatedAt",Instant.now());
        answer.put("counts",counts); answer.put("rows",result);
        return answer;
    }
    public Map<String,Object> contacted(UUID invitationId,UUID eventId,Contact input,java.security.Principal principal) {
        ApiErrors.require(assigned(invitationId,eventId),"Lời mời này không thuộc buổi tiệc đã chọn.");
        String who=principal==null?"owner":principal.getName();
        db.update("INSERT INTO invitation_reminders(invitation_id,event_id,contacted_at,contacted_by,note) VALUES(?,?,now(),?,?) ON CONFLICT(invitation_id,event_id) DO UPDATE SET contacted_at=now(),contacted_by=EXCLUDED.contacted_by,note=EXCLUDED.note",invitationId,eventId,who,input.note()==null?"":input.note());
        db.update("INSERT INTO audit(action,target) VALUES('REMINDER_CONTACTED',?)",invitationId.toString());
        return Map.of("invitationId",invitationId,"eventId",eventId,"contactedBy",who);
    }
    /** Undo a mistaken mark: the record disappears, so the guest returns to the to-do list. */
    public void clear(UUID invitationId,UUID eventId) {
        ApiErrors.require(db.update("DELETE FROM invitation_reminders WHERE invitation_id=? AND event_id=?",invitationId,eventId)>0,"Chưa có ghi nhận nhắc cho lời mời này.");
        db.update("INSERT INTO audit(action,target) VALUES('REMINDER_CLEAR',?)",invitationId.toString());
    }
    private boolean assigned(UUID invitationId,UUID eventId) { return db.queryForObject("SELECT count(*) FROM assignments WHERE invitation_id=? AND event_id=?",Integer.class,invitationId,eventId)==1; }
    private static String message(Map<String,Object> row,Map<String,Object> event) {
        String name=String.valueOf(row.get("display_name"));
        return "Chào "+name+", chúng mình rất mong được gặp bạn tại "+event.get("title")+" ("+human(AccessGate.instant(event.get("start_at")),(String)event.get("timezone"))+"). "
            +"Bạn dành chút thời gian xác nhận giúp chúng mình trước "+human(AccessGate.instant(event.get("deadline")),(String)event.get("timezone"))+" nhé. "
            +"Nếu cần hỗ trợ gì thêm, bạn cứ nhắn cho chúng mình. Cảm ơn bạn nhiều!";
    }
    private static String human(Instant value,String timezone) {
        if(value==null) return "sớm nhất có thể";
        ZoneId zone; try { zone=ZoneId.of(timezone); } catch(RuntimeException e) { zone=ZoneId.of("Asia/Ho_Chi_Minh"); }
        return HUMAN.withZone(zone).format(value);
    }
}