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
    public record EventInput(@NotBlank @Size(max=200) String title,@NotNull Instant startAt,@NotNull Instant deadline,@NotBlank @Size(max=200) String venue,@NotBlank @Size(max=500) String address,@NotBlank String timezone,@Min(1) int capacity,@Size(max=500) String mapsUrl,@Size(max=200) String dressCode,@Size(max=500) String parking,@Size(max=500) String note,@Size(max=500) String changeNotice,long expectedVersion) {}
    public record CancelInput(@Size(max=500) String reason,long expectedVersion) {}
    public record Assignment(@NotNull UUID eventId,@Min(1) @Max(20) int maxPeople) {}
    public record GuestInput(@NotBlank @Size(max=200) String displayName,@NotNull @Size(max=100) String groupName,@NotBlank @Size(max=80) String salutation,@NotEmpty @Size(max=20) List<@Valid Assignment> assignments) {}
    public record PolicyInput(@Pattern(regexp="INHERIT|MANUAL_OPEN|MANUAL_CLOSED|SCHEDULED") @NotNull String mode,Instant openAt,Instant closeAt,long expectedVersion) {}
    public record TrackingInput(boolean enabled,long expectedVersion) {}
    public Map<String,Object> wedding() { var result=new HashMap<>(db.queryForMap("SELECT * FROM wedding WHERE id=1")); result.putAll(media.draft()); return result; }
    private Map<String,Object> lockWedding() { return db.queryForMap("SELECT * FROM wedding WHERE id=1 FOR UPDATE"); }
    public void audit(String action,Object target) { db.update("INSERT INTO audit(action,target) VALUES(?,?)",action,target.toString()); }
    public void saveWedding(WeddingInput input) {
        ApiErrors.version(number(lockWedding(),"version"),input.expectedVersion());
        db.update("UPDATE wedding SET draft_names=?,draft_message=?,version=version+1 WHERE id=1",input.names(),input.message()); audit("WEDDING_DRAFT",1);
    }
    public void publishWedding(boolean published,long version) {
        ApiErrors.version(number(lockWedding(),"version"),version);
        if(published) { db.update("UPDATE wedding SET names=draft_names,message=draft_message,theme=draft_theme,accent=draft_accent,story=draft_story,footer=draft_footer,show_story=draft_show_story,music_id=draft_music_id,show_countdown=draft_show_countdown,published=true,version=version+1 WHERE id=1"); media.publishSelection(); }
        else db.update("UPDATE wedding SET published=false,version=version+1 WHERE id=1");
        audit(published?"WEDDING_PUBLISH":"WEDDING_UNPUBLISH",1);
    }
    /** Turning tracking off stops new recordings; existing records stay and are never deleted (docs/13 §11). */
    public void tracking(boolean enabled,long version) {
        var row=lockWedding(); ApiErrors.version(number(row,"version"),version);
        db.update("UPDATE wedding SET tracking=?,version=version+1 WHERE id=1",enabled);
        audit(enabled?"TRACKING_ENABLE":"TRACKING_DISABLE",1);
    }
    public List<Map<String,Object>> events() { return db.queryForList("SELECT * FROM events ORDER BY start_at"); }
    public UUID saveEvent(UUID id,EventInput input) {
        lockWedding(); ZoneId.of(input.timezone()); requireWindow(input);
        String maps=maps(input.mapsUrl()),dress=optional(input.dressCode(),200,"Trang phục"),parking=optional(input.parking(),500,"Chỗ đỗ xe"),note=text(input.note(),500,"Ghi chú");
        if(id==null) {
            id=UUID.randomUUID(); String eventCode="E-"+UUID.randomUUID().toString().replace("-","").substring(0,8).toUpperCase(Locale.ROOT); db.update("INSERT INTO events(id,event_code,title,start_at,deadline,venue,address,timezone,capacity,maps_url,dress_code,parking,note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",id,eventCode,input.title(),java.sql.Timestamp.from(input.startAt()),java.sql.Timestamp.from(input.deadline()),input.venue(),input.address(),input.timezone(),input.capacity(),maps,dress,parking,note);
        } else {
            var row=db.queryForMap("SELECT * FROM events WHERE id=? FOR UPDATE",id); ApiErrors.version(number(row,"version"),input.expectedVersion());
            ApiErrors.require("DRAFT".equals(row.get("state")),"Chỉ sửa buổi tiệc nháp ở đây. Buổi đã phát hành dùng “Phát hành phiên bản mới”.");
            db.update("UPDATE events SET title=?,start_at=?,deadline=?,venue=?,address=?,timezone=?,capacity=?,maps_url=?,dress_code=?,parking=?,note=?,version=version+1 WHERE id=?",input.title(),java.sql.Timestamp.from(input.startAt()),java.sql.Timestamp.from(input.deadline()),input.venue(),input.address(),input.timezone(),input.capacity(),maps,dress,parking,note,id);
        }
        audit("EVENT_SAVE",id); return id;
    }
    /** Published events stay editable through an explicit revision plus a change notice guests can read (docs/02 §10). */
    public void reviseEvent(UUID id,EventInput input) {
        lockWedding(); ZoneId.of(input.timezone());
        var row=db.queryForMap("SELECT * FROM events WHERE id=? FOR UPDATE",id); ApiErrors.version(number(row,"version"),input.expectedVersion());
        ApiErrors.require("PUBLISHED".equals(row.get("state")),"Chỉ phát hành phiên bản mới cho buổi tiệc đang phát hành.");
        requireWindow(input);
        String maps=maps(input.mapsUrl()),dress=optional(input.dressCode(),200,"Trang phục"),parking=optional(input.parking(),500,"Chỗ đỗ xe"),note=text(input.note(),500,"Ghi chú"),notice=optional(input.changeNotice(),500,"Thông báo thay đổi");
        boolean timeChanged=((java.sql.Timestamp)row.get("start_at")).toInstant().getEpochSecond()!=input.startAt().getEpochSecond();
        boolean placeChanged=!input.venue().equals(row.get("venue"))||!input.address().equals(row.get("address"));
        ApiErrors.require(!(timeChanged||placeChanged)||notice!=null,"Hãy viết thông báo thay đổi khi sửa giờ hoặc địa điểm của buổi tiệc đã phát hành.");
        db.update("UPDATE events SET title=?,start_at=?,deadline=?,venue=?,address=?,timezone=?,capacity=?,maps_url=?,dress_code=?,parking=?,note=?,change_notice=COALESCE(?,change_notice),revision=revision+1,version=version+1 WHERE id=?",input.title(),java.sql.Timestamp.from(input.startAt()),java.sql.Timestamp.from(input.deadline()),input.venue(),input.address(),input.timezone(),input.capacity(),maps,dress,parking,note,notice,id);
        audit("EVENT_REVISE",id);
    }
    private static void requireWindow(EventInput input) { ApiErrors.require(!input.deadline().isAfter(input.startAt()),"Hạn phản hồi phải trước giờ tiệc."); }
    private static String optional(String value,int max,String label) { if(value==null||value.isBlank()) return null; String trimmed=value.strip(); ApiErrors.require(trimmed.length()<=max,label+" quá dài."); return trimmed; }
    private static String text(String value,int max,String label) { String trimmed=optional(value,max,label); return trimmed==null?"":trimmed; }
    private static String maps(String url) { String value=optional(url,500,"Liên kết bản đồ"); ApiErrors.require(value==null||value.startsWith("https://"),"Liên kết bản đồ phải bắt đầu bằng https://."); return value; }
    /** Guests must be told why a published event was cancelled, so the reason is mandatory (docs/02 §10). */
    private static String requireReason(String value) { String reason=optional(value,500,"Lý do hủy"); ApiErrors.require(reason!=null,"Hãy ghi lý do hủy buổi tiệc để lưu vào nhật ký và giải thích cho khách."); return reason; }
    public void eventState(UUID id,String state,long version) {
        lockWedding(); ApiErrors.require("PUBLISHED".equals(state),"Trạng thái không hợp lệ.");
        var row=db.queryForMap("SELECT * FROM events WHERE id=? FOR UPDATE",id); ApiErrors.version(number(row,"version"),version);
        ApiErrors.require(!"CANCELLED".equals(row.get("state")),"Buổi tiệc đã hủy không thể phát hành lại.");
        db.update("UPDATE events SET state=?,version=version+1 WHERE id=?",state,id); audit("EVENT_"+state,id);
    }
    /** Cancelling keeps the reason for the admin; guests only see that the event is cancelled (docs/02 §10). */
    public void cancelEvent(UUID id,CancelInput input) {
        lockWedding(); var row=db.queryForMap("SELECT * FROM events WHERE id=? FOR UPDATE",id); ApiErrors.version(number(row,"version"),input.expectedVersion());
        ApiErrors.require(!"CANCELLED".equals(row.get("state")),"Buổi tiệc đã được hủy trước đó.");
        db.update("UPDATE events SET state='CANCELLED',cancel_reason=?,revision=revision+1,version=version+1 WHERE id=?",requireReason(input.reason()),id);
        audit("EVENT_CANCELLED",id);
    }
    public UUID createGuest(GuestInput input) {
        lockWedding(); UUID id=UUID.randomUUID(); String token=tokens.mint();
        ApiErrors.require(input.assignments().stream().map(Assignment::eventId).distinct().count()==input.assignments().size(),"Buổi tiệc bị trùng.");
        for(var a:input.assignments()) ApiErrors.require(db.queryForObject("SELECT count(*) FROM events WHERE id=? AND state<>'CANCELLED'",Integer.class,a.eventId())==1,"Buổi tiệc không hợp lệ.");
        db.update("INSERT INTO invitations(id,display_name,group_name,salutation,token_hash,token_cipher) VALUES(?,?,?,?,?,?)",id,input.displayName(),input.groupName(),input.salutation(),TokenService.hash(token),tokens.encrypt(token,id));
        for(var a:input.assignments()) db.update("INSERT INTO assignments VALUES(?,?,?)",id,a.eventId(),a.maxPeople());
        audit("INVITATION_CREATE",id); return id;
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
    public List<Map<String,Object>> audit() { return db.queryForList("SELECT * FROM audit ORDER BY id DESC LIMIT 100"); }
}