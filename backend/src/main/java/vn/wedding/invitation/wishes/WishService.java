package vn.wedding.invitation.wishes;

import java.util.*;
import java.util.regex.Pattern;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.wedding.invitation.access.AccessGate;
import vn.wedding.invitation.common.ApiErrors;
import vn.wedding.invitation.common.Texts;
import static vn.wedding.invitation.access.AccessGate.number;

/**
 * T24 wish book: a guest writes a wish, the owner approves it before anybody can read it.
 * Wishes stay separate from RSVP notes and from open tracking, and every read/write goes through
 * the same access gate as the invitation itself (grant + open marker + window + PIN).
 */
@Service
@Transactional
public class WishService {
    private final JdbcTemplate db;
    private final AccessGate gate;
    public WishService(JdbcTemplate db,AccessGate gate) { this.db=db; this.gate=gate; }
    /** A guest may write a few wishes, not a wall of spam; the queue is reviewed by a human anyway. */
    private static final int MAX_PER_INVITATION=3;
    private static final Set<String> STATES=Set.of("PENDING","APPROVED","REJECTED");
    /** Control/format characters are dropped; newlines and tabs survive so a wish can keep its shape. */
    private static final Pattern CONTROL=Pattern.compile("[\\p{Cntrl}\\p{Cf}&&[^\\n\\t]]");
    public record Input(@Size(max=200) String displayName,@Size(max=600) String message,UUID eventId) {}
    public Map<String,Object> submit(UUID invitationId,Input input,HttpSession session) {
        var invitation=gate.check(invitationId,session,true);
        ApiErrors.require(db.queryForObject("SELECT count(*) FROM wishes WHERE invitation_id=?",Integer.class,invitationId)<MAX_PER_INVITATION,"Bạn đã gửi đủ "+MAX_PER_INVITATION+" lời chúc cho lời mời này.");
        String message=clean(input.message());
        ApiErrors.require(message.length()>=2,"Lời chúc cần ít nhất 2 ký tự.");
        ApiErrors.require(message.length()<=600,"Lời chúc không được dài quá 600 ký tự.");
        String name=clean(input.displayName());
        if(name.isEmpty()) name=String.valueOf(invitation.get("display_name"));
        ApiErrors.require(name.length()<=200,"Tên hiển thị quá dài.");
        if(input.eventId()!=null) ApiErrors.require(db.queryForObject("SELECT count(*) FROM assignments WHERE invitation_id=? AND event_id=?",Integer.class,invitationId,input.eventId())==1,"Buổi tiệc này không thuộc lời mời.");
        UUID id=UUID.randomUUID();
        db.update("INSERT INTO wishes(id,invitation_id,event_id,display_name,message) VALUES(?,?,?,?,?)",id,invitationId,input.eventId(),name,message);
        db.update("INSERT INTO audit(action,target) VALUES('WISH_SUBMIT',?)",id.toString());
        return Map.of("id",id,"state","PENDING","displayName",name,"message",message);
    }
    /** The author still sees their own pending wishes, so nothing they wrote silently disappears. */
    public List<Map<String,Object>> mine(UUID invitationId,HttpSession session) {
        gate.check(invitationId,session,true);
        return db.queryForList("SELECT id,display_name,message,state,created_at,moderated_at FROM wishes WHERE invitation_id=? ORDER BY created_at DESC",invitationId);
    }
    /** Plain text only: control characters are stripped server-side, React escapes what is left. */
    static String clean(String value) {
        if(value==null) return "";
        String text=CONTROL.matcher(value.replace("\r\n","\n").replace('\r','\n')).replaceAll("").replace('\t',' ').trim();
        return Texts.nfc(text.replaceAll(" {2,}"," ").replaceAll("\n{3,}","\n\n").replaceAll(" *\n *","\n"));
    }
    /** Moderation queue: pending items first, then everything already decided. */
    public Map<String,Object> queue(int page,String state,String query) {
        ApiErrors.require(page>=0&&page<=100000,"Trang không hợp lệ.");
        List<Object> args=new ArrayList<>(); List<String> where=new ArrayList<>();
        if(state!=null&&!state.isBlank()) { String normalized=state.toUpperCase(Locale.ROOT); ApiErrors.require(STATES.contains(normalized),"Trạng thái lời chúc không hợp lệ."); where.add("w.state=?"); args.add(normalized); }
        if(query!=null&&!query.isBlank()) { where.add("(w.display_name ILIKE ? OR w.message ILIKE ?)"); args.add("%"+query.trim()+"%"); args.add("%"+query.trim()+"%"); }
        String filter=where.isEmpty()?"":" WHERE "+String.join(" AND ",where);
        args.add(page*50);
        Map<String,Object> answer=new LinkedHashMap<>();
        answer.put("counts",db.queryForMap("SELECT count(*) FILTER (WHERE state='PENDING') pending,count(*) FILTER (WHERE state='APPROVED') approved,count(*) FILTER (WHERE state='REJECTED') rejected FROM wishes"));
        answer.put("rows",db.queryForList("SELECT w.id,w.display_name,w.message,w.state,w.created_at,w.moderated_at,w.moderated_by,w.revision,i.id invitation_id,i.display_name invitation_name,i.group_name,(SELECT string_agg(e.title,' · ' ORDER BY e.start_at) FROM assignments a JOIN events e ON e.id=a.event_id WHERE a.invitation_id=i.id AND e.state<>'CANCELLED') assigned_events FROM wishes w JOIN invitations i ON i.id=w.invitation_id"+filter+" ORDER BY case when w.state='PENDING' then 0 else 1 end,w.created_at DESC LIMIT 50 OFFSET ?",args.toArray()));
        return answer;
    }
    public Map<String,Object> moderate(UUID wishId,String state,long expectedVersion,java.security.Principal principal) {
        String normalized=state==null?"":state.toUpperCase(Locale.ROOT);
        ApiErrors.require(!normalized.equals("PENDING")&&STATES.contains(normalized),"Chỉ có thể duyệt hoặc từ chối lời chúc.");
        var rows=db.queryForList("SELECT * FROM wishes WHERE id=? FOR UPDATE",wishId);
        ApiErrors.require(!rows.isEmpty(),"Lời chúc không tồn tại.");
        var row=rows.getFirst();
        ApiErrors.version(number(row,"revision"),expectedVersion);
        db.update("UPDATE wishes SET state=?,moderated_at=now(),moderated_by=?,revision=revision+1 WHERE id=?",normalized,principal==null?"owner":principal.getName(),wishId);
        db.update("INSERT INTO audit(action,target) VALUES(?,?)",normalized.equals("APPROVED")?"WISH_APPROVE":"WISH_REJECT",wishId.toString());
        return Map.of("id",wishId,"state",normalized);
    }
    /** The owner may fix a typo before approving; the system never silently rewrites a guest's text. */
    public Map<String,Object> update(UUID wishId,String message,long expectedVersion) {
        var rows=db.queryForList("SELECT * FROM wishes WHERE id=? FOR UPDATE",wishId);
        ApiErrors.require(!rows.isEmpty(),"Lời chúc không tồn tại.");
        var row=rows.getFirst();
        ApiErrors.version(number(row,"revision"),expectedVersion);
        String cleaned=clean(message);
        ApiErrors.require(cleaned.length()>=2&&cleaned.length()<=600,"Lời chúc cần từ 2 đến 600 ký tự.");
        db.update("UPDATE wishes SET message=?,revision=revision+1 WHERE id=?",cleaned,wishId);
        db.update("INSERT INTO audit(action,target) VALUES('WISH_UPDATE',?)",wishId.toString());
        return Map.of("id",wishId,"message",cleaned);
    }
    public void remove(UUID wishId) {
        ApiErrors.require(db.update("DELETE FROM wishes WHERE id=?",wishId)>0,"Lời chúc không tồn tại.");
        db.update("INSERT INTO audit(action,target) VALUES('WISH_DELETE',?)",wishId.toString());
    }
    /** Only approved wishes are ever shown to a guest or on the public invitation. */
    public List<Map<String,Object>> approved(UUID invitationId) { return db.queryForList("SELECT display_name,message,created_at FROM wishes WHERE invitation_id=? AND state='APPROVED' ORDER BY created_at DESC LIMIT 20",invitationId); }
    public List<Map<String,Object>> approvedPublic() { return db.queryForList("SELECT display_name,message,created_at FROM wishes WHERE state='APPROVED' ORDER BY created_at DESC LIMIT 30"); }
}