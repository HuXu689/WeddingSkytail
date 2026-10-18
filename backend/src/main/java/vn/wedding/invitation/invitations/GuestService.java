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

@Service
@Transactional
public class GuestService {
    private final JdbcTemplate db;
    private final AccessGate gate;
    private final TokenService tokens;
    private final MediaService media;
    public GuestService(JdbcTemplate db,AccessGate gate,TokenService tokens,MediaService media) { this.db=db; this.gate=gate; this.tokens=tokens; this.media=media; }
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
        session.setAttribute("open:"+id,gate.marker(wedding,invitation));
        if(Boolean.TRUE.equals(wedding.get("tracking")) && !owner) db.update("INSERT INTO open_events(invitation_id,pseudonym,bucket) VALUES(?,?,?) ON CONFLICT DO NOTHING",id,tokens.pseudonym(session.getId(),id),Instant.now().getEpochSecond()/600);
    }
    public Map<String,Object> state(UUID id,HttpSession session) {
        var invitation=gate.check(id,session,false);
        var wedding=db.queryForMap("SELECT * FROM wedding WHERE id=1");
        return Map.of("opened",Objects.equals(session.getAttribute("open:"+id),gate.marker(wedding,invitation)));
    }
    public Map<String,Object> view(UUID id,HttpSession session) {
        var invitation=gate.check(id,session,true);
        var wedding=db.queryForMap("SELECT names,message,theme,accent,story,footer,show_story FROM wedding WHERE id=1");
        var events=db.queryForList("SELECT e.id,e.title,e.start_at,e.deadline,e.timezone,e.venue,e.address,e.state,a.max_people,r.status,r.total_people,r.note,coalesce(r.version,0) response_version,(e.state='PUBLISHED' AND now()<e.deadline) rsvp_open FROM assignments a JOIN events e ON e.id=a.event_id LEFT JOIN responses r ON r.invitation_id=a.invitation_id AND r.event_id=a.event_id WHERE a.invitation_id=? AND e.state IN ('PUBLISHED','CANCELLED') ORDER BY e.start_at",id);
        var design=new HashMap<String,Object>(wedding); design.putAll(media.published());
        return Map.of("invitationId",id,"displayName",invitation.get("display_name"),"salutation",invitation.get("salutation"),"wedding",design,"events",events);
    }
    public Object publicWedding(String slug) {
        var rows=db.queryForList("SELECT names,message,slug,theme,accent,story,footer,show_story FROM wedding WHERE slug=? AND published=true",slug);
        if(rows.isEmpty()) throw ApiErrors.unavailable(); var result=new HashMap<String,Object>(rows.getFirst()); result.putAll(media.published()); return result;
    }
}