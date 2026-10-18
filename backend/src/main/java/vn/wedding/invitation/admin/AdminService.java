package vn.wedding.invitation.admin;

import java.time.*;
import java.util.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import vn.wedding.invitation.invitations.TokenService;
import vn.wedding.invitation.media.MediaService;
import vn.wedding.invitation.common.ApiErrors;
import static vn.wedding.invitation.access.AccessGate.number;

@Service
@Transactional
public class AdminService {
    private final JdbcTemplate db;
    private final TokenService tokens;
    private final MediaService media;
    public AdminService(JdbcTemplate db,TokenService tokens,MediaService media) { this.db=db; this.tokens=tokens; this.media=media; }
    public record WeddingInput(@NotBlank @Size(max=200) String names,@NotNull @Size(max=2000) String message,long expectedVersion) {}
    public record EventInput(@NotBlank @Size(max=200) String title,@NotNull Instant startAt,@NotNull Instant deadline,@NotBlank @Size(max=200) String venue,@NotBlank @Size(max=500) String address,@NotBlank String timezone,@Min(1) int capacity,long expectedVersion) {}
    public record Assignment(@NotNull UUID eventId,@Min(1) @Max(20) int maxPeople) {}
    public record GuestInput(@NotBlank @Size(max=200) String displayName,@NotNull @Size(max=100) String groupName,@NotBlank @Size(max=80) String salutation,@NotEmpty @Size(max=20) List<@Valid Assignment> assignments) {}
    public record PolicyInput(@Pattern(regexp="INHERIT|MANUAL_OPEN|MANUAL_CLOSED|SCHEDULED") @NotNull String mode,Instant openAt,Instant closeAt,long expectedVersion) {}
    public Map<String,Object> wedding() { var result=new HashMap<>(db.queryForMap("SELECT * FROM wedding WHERE id=1")); result.putAll(media.draft()); return result; }
    private Map<String,Object> lockWedding() { return db.queryForMap("SELECT * FROM wedding WHERE id=1 FOR UPDATE"); }
    public void audit(String action,Object target) { db.update("INSERT INTO audit(action,target) VALUES(?,?)",action,target.toString()); }
    public void saveWedding(WeddingInput input) {
        ApiErrors.version(number(lockWedding(),"version"),input.expectedVersion());
        db.update("UPDATE wedding SET draft_names=?,draft_message=?,version=version+1 WHERE id=1",input.names(),input.message()); audit("WEDDING_DRAFT",1);
    }
    public void publishWedding(boolean published,long version) {
        ApiErrors.version(number(lockWedding(),"version"),version);
        if(published) { db.update("UPDATE wedding SET names=draft_names,message=draft_message,theme=draft_theme,accent=draft_accent,story=draft_story,footer=draft_footer,show_story=draft_show_story,published=true,version=version+1 WHERE id=1"); media.publishSelection(); }
        else db.update("UPDATE wedding SET published=false,version=version+1 WHERE id=1");
        audit(published?"WEDDING_PUBLISH":"WEDDING_UNPUBLISH",1);
    }
    public List<Map<String,Object>> events() { return db.queryForList("SELECT * FROM events ORDER BY start_at"); }
    public UUID saveEvent(UUID id,EventInput input) {
        lockWedding(); ZoneId.of(input.timezone()); ApiErrors.require(!input.deadline().isAfter(input.startAt()),"Hạn phản hồi phải trước giờ tiệc.");
        if(id==null) {
            id=UUID.randomUUID(); String eventCode="E-"+UUID.randomUUID().toString().replace("-","").substring(0,8).toUpperCase(Locale.ROOT); db.update("INSERT INTO events(id,event_code,title,start_at,deadline,venue,address,timezone,capacity) VALUES(?,?,?,?,?,?,?,?,?)",id,eventCode,input.title(),java.sql.Timestamp.from(input.startAt()),java.sql.Timestamp.from(input.deadline()),input.venue(),input.address(),input.timezone(),input.capacity());
        } else {
            var row=db.queryForMap("SELECT * FROM events WHERE id=? FOR UPDATE",id); ApiErrors.version(number(row,"version"),input.expectedVersion());
            ApiErrors.require("DRAFT".equals(row.get("state")),"Chỉ sửa sự kiện nháp. Hủy sự kiện đã phát hành nếu cần thay đổi lịch.");
            db.update("UPDATE events SET title=?,start_at=?,deadline=?,venue=?,address=?,timezone=?,capacity=?,version=version+1 WHERE id=?",input.title(),java.sql.Timestamp.from(input.startAt()),java.sql.Timestamp.from(input.deadline()),input.venue(),input.address(),input.timezone(),input.capacity(),id);
        }
        audit("EVENT_SAVE",id); return id;
    }
    public void eventState(UUID id,String state,long version) {
        lockWedding(); ApiErrors.require(Set.of("PUBLISHED","CANCELLED").contains(state),"Trạng thái không hợp lệ.");
        var row=db.queryForMap("SELECT * FROM events WHERE id=? FOR UPDATE",id); ApiErrors.version(number(row,"version"),version);
        ApiErrors.require(!"CANCELLED".equals(row.get("state")),"Sự kiện đã hủy không thể phát hành lại.");
        db.update("UPDATE events SET state=?,version=version+1 WHERE id=?",state,id); audit("EVENT_"+state,id);
    }
    public UUID createGuest(GuestInput input) {
        lockWedding(); UUID id=UUID.randomUUID(); String token=tokens.mint();
        ApiErrors.require(input.assignments().stream().map(Assignment::eventId).distinct().count()==input.assignments().size(),"Buổi tiệc bị trùng.");
        for(var a:input.assignments()) ApiErrors.require(db.queryForObject("SELECT count(*) FROM events WHERE id=? AND state<>'CANCELLED'",Integer.class,a.eventId())==1,"Buổi tiệc không hợp lệ.");
        db.update("INSERT INTO invitations(id,display_name,group_name,salutation,token_hash,token_cipher) VALUES(?,?,?,?,?,?)",id,input.displayName(),input.groupName(),input.salutation(),TokenService.hash(token),tokens.encrypt(token,id));
        for(var a:input.assignments()) db.update("INSERT INTO assignments VALUES(?,?,?)",id,a.eventId(),a.maxPeople());
        audit("INVITATION_CREATE",id); return id;
    }
    public List<Map<String,Object>> invitations(int page) {
        ApiErrors.require(page>=0 && page<=100000,"Trang không hợp lệ.");
        return db.queryForList("SELECT i.id,i.display_name,i.group_name,i.salutation,i.active,i.mode,i.open_at,i.close_at,i.sent,i.version,(SELECT min(opened_at) FROM open_events o WHERE o.invitation_id=i.id) first_opened_at,(SELECT max(opened_at) FROM open_events o WHERE o.invitation_id=i.id) last_opened_at FROM invitations i ORDER BY i.display_name,i.id LIMIT 50 OFFSET ?",page*50);
    }
    public void policy(UUID id,PolicyInput input) {
        var wedding=lockWedding();
        ApiErrors.require(id!=null || !input.mode().equals("INHERIT"),"Chính sách chung không thể INHERIT.");
        ApiErrors.require(!input.mode().equals("SCHEDULED") || (input.openAt()!=null && (input.closeAt()==null || input.closeAt().isAfter(input.openAt()))),"Lịch mở/đóng không hợp lệ.");
        var row=id==null?wedding:db.queryForMap("SELECT * FROM invitations WHERE id=? FOR UPDATE",id); ApiErrors.version(number(row,"version"),input.expectedVersion());
        Object open=input.openAt()==null?null:java.sql.Timestamp.from(input.openAt()); Object close=input.closeAt()==null?null:java.sql.Timestamp.from(input.closeAt());
        if(id==null) db.update("UPDATE wedding SET mode=?,open_at=?,close_at=?,version=version+1 WHERE id=1",input.mode(),open,close);
        else db.update("UPDATE invitations SET mode=?,open_at=?,close_at=?,version=version+1 WHERE id=?",input.mode(),open,close,id);
        audit("ACCESS_"+input.mode(),id==null?1:id);
    }
    public String reveal(UUID id) {
        var row=db.queryForMap("SELECT * FROM invitations WHERE id=?",id); ApiErrors.require(Boolean.TRUE.equals(row.get("active")),"Link đã thu hồi."); audit("LINK_REVEAL",id); return tokens.decrypt((String)row.get("token_cipher"),id);
    }
    public void action(UUID id,String action,long version) {
        lockWedding(); var row=db.queryForMap("SELECT * FROM invitations WHERE id=? FOR UPDATE",id); ApiErrors.version(number(row,"version"),version);
        switch(action) {
            case "sent" -> db.update("UPDATE invitations SET sent=true,version=version+1 WHERE id=?",id);
            case "revoke" -> db.update("UPDATE invitations SET active=false,auth_revision=auth_revision+1,version=version+1 WHERE id=?",id);
            case "rotate" -> { String token=tokens.mint(); db.update("UPDATE invitations SET active=true,token_hash=?,token_cipher=?,auth_revision=auth_revision+1,version=version+1 WHERE id=?",TokenService.hash(token),tokens.encrypt(token,id),id); }
            default -> throw new IllegalArgumentException();
        }
        audit("INVITATION_"+action.toUpperCase(Locale.ROOT),id);
    }
    public List<Map<String,Object>> dashboard() {
        return db.queryForList("SELECT e.id,e.title,e.state,e.capacity,count(i.id) invited_parties,count(i.id) FILTER(WHERE r.status IS NULL) unanswered,count(i.id) FILTER(WHERE r.status='ATTENDING') attending,count(i.id) FILTER(WHERE r.status='DECLINED') declined,coalesce(sum(r.total_people) FILTER(WHERE i.active AND r.status='ATTENDING'),0) confirmed_people FROM events e LEFT JOIN assignments a ON a.event_id=e.id LEFT JOIN invitations i ON i.id=a.invitation_id AND i.active LEFT JOIN responses r ON r.invitation_id=i.id AND r.event_id=e.id WHERE e.state='PUBLISHED' GROUP BY e.id ORDER BY e.start_at");
    }
    public List<Map<String,Object>> responses() { return db.queryForList("SELECT i.display_name,e.title,r.status,r.total_people,r.note,r.updated_at FROM responses r JOIN invitations i ON i.id=r.invitation_id JOIN events e ON e.id=r.event_id ORDER BY r.updated_at DESC LIMIT 200"); }
    public List<Map<String,Object>> audit() { return db.queryForList("SELECT * FROM audit ORDER BY id DESC LIMIT 100"); }
}