package vn.wedding.invitation.invitations;

import java.time.Instant;
import java.util.*;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import vn.wedding.invitation.access.AccessGate;
import vn.wedding.invitation.common.ApiErrors;
import vn.wedding.invitation.media.MediaService;
import vn.wedding.invitation.wishes.WishService;

@Service
@Transactional
public class GuestService {
    private final JdbcTemplate db;
    private final AccessGate gate;
    private final TokenService tokens;
    private final MediaService media;
    private final WishService wishes;
    public GuestService(JdbcTemplate db,AccessGate gate,TokenService tokens,MediaService media,WishService wishes) { this.db=db; this.gate=gate; this.tokens=tokens; this.media=media; this.wishes=wishes; }
    public UUID redeem(String token,HttpSession session) {
        if(token==null || !token.matches("[A-Za-z0-9_-]{43}")) throw ApiErrors.unavailable();
        var rows=db.queryForList("SELECT id FROM invitations WHERE token_hash=?",TokenService.hash(token));
        if(rows.isEmpty()) throw ApiErrors.unavailable();
        UUID id=(UUID)rows.getFirst().get("id"); var invitation=gate.checkCredential(id,TokenService.hash(token));
        long count=Collections.list(session.getAttributeNames()).stream().filter(n->n.startsWith("grant:")).count();
        ApiErrors.require(count<20 || session.getAttribute("grant:"+id)!=null,"Vui lòng mở link bằng phiên trình duyệt mới.");
        session.setAttribute("grant:"+id,AccessGate.number(invitation,"auth_revision")); return id;
    }
    public void open(UUID id,HttpSession session,boolean owner) {
        var invitation=gate.check(id,session,false); var wedding=db.queryForMap("SELECT * FROM wedding WHERE id=1");
        // Gate first on every retry: idempotency must never revive a closed/revoked grant.
        var marker=gate.marker(wedding,invitation);
        if(Objects.equals(session.getAttribute("open:"+id),marker)) return;
        session.setAttribute("open:"+id,marker);
        if(Boolean.TRUE.equals(wedding.get("tracking")) && !owner) db.update("INSERT INTO open_events(invitation_id,pseudonym,bucket) VALUES(?,?,?) ON CONFLICT DO NOTHING",id,tokens.pseudonym(session.getId(),id),Instant.now().getEpochSecond()/600);
    }
    public Map<String,Object> state(UUID id,HttpSession session) {
        var invitation=gate.check(id,session,false);
        var wedding=db.queryForMap("SELECT * FROM wedding WHERE id=1");
        return Map.of("opened",Objects.equals(session.getAttribute("open:"+id),gate.marker(wedding,invitation)));
    }
    public Map<String,Object> view(UUID id,HttpSession session) {
        var invitation=gate.check(id,session,true);
        var wedding=db.queryForMap("SELECT names,message,theme,accent,story,footer,show_story,show_countdown,music_autoplay FROM wedding WHERE id=1");
        var events=db.queryForList("SELECT e.id,e.title,e.start_at,e.deadline,e.timezone,e.venue,e.address,e.maps_url,e.dress_code,e.parking,e.note AS event_note,e.change_notice,e.revision,e.state,a.max_people,r.status,r.total_people,r.note AS note,coalesce(r.version,0) response_version,(e.state='PUBLISHED' AND now()<e.deadline) rsvp_open FROM assignments a JOIN events e ON e.id=a.event_id LEFT JOIN responses r ON r.invitation_id=a.invitation_id AND r.event_id=a.event_id WHERE a.invitation_id=? AND e.state IN ('PUBLISHED','CANCELLED') ORDER BY e.start_at",id);
        var design=new HashMap<String,Object>(wedding); design.putAll(media.published()); design.put("sections",vn.wedding.invitation.wedding.SectionService.list(db,false,true)); design.put("layout",vn.wedding.invitation.wedding.LayoutService.list(db,false)); design.put("templateVersion",1); design.put("contentSchemaVersion",1);
        return Map.of("invitationId",id,"displayName",invitation.get("display_name"),"salutation",invitation.get("salutation"),"wedding",design,"events",events,"wishes",wishes.approved(id));
    }
    public Object publicWedding(String slug) {
        var rows=db.queryForList("SELECT names,message,slug,theme,accent,story,footer,show_story,show_countdown,music_autoplay FROM wedding WHERE slug=? AND published=true",slug);
        if(rows.isEmpty()) throw ApiErrors.unavailable(); var result=new HashMap<String,Object>(rows.getFirst()); result.putAll(media.published()); result.put("sections",vn.wedding.invitation.wedding.SectionService.list(db,false,false)); result.put("layout",vn.wedding.invitation.wedding.LayoutService.list(db,false)); result.put("templateVersion",1); result.put("contentSchemaVersion",1); result.put("wishes",wishes.approvedPublic()); return result;
    }
    /** "Add to calendar" must pass exactly the same gate as the invitation itself: grant, open marker, access window and PIN (P1). */
    public CalendarFile.Event calendar(UUID id,UUID eventId,HttpSession session) {
        gate.check(id,session,true);
        var rows=db.queryForList("SELECT e.id,e.title,e.start_at,e.timezone,e.venue,e.address,e.maps_url,e.change_notice,e.state FROM assignments a JOIN events e ON e.id=a.event_id WHERE a.invitation_id=? AND e.id=? AND e.state IN ('PUBLISHED','CANCELLED')",id,eventId);
        if(rows.isEmpty()) throw ApiErrors.unavailable();
        var row=rows.getFirst();
        return new CalendarFile.Event(eventId+"-"+id,(String)row.get("title"),AccessGate.instant(row.get("start_at")),(String)row.get("timezone"),(String)row.get("venue"),(String)row.get("address"),(String)row.get("maps_url"),(String)row.get("change_notice"),(String)row.get("state"));
    }
}