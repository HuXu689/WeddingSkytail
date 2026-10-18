package vn.wedding.invitation.access;

import java.time.Instant;
import java.sql.Timestamp;
import java.util.*;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.wedding.invitation.common.ApiErrors;

@Service
public class AccessGate {
    private final JdbcTemplate db;
    public AccessGate(JdbcTemplate db) { this.db=db; }
    public static boolean allows(String mode, Instant open, Instant close, Instant now) {
        return switch(mode) { case "INHERIT", "MANUAL_OPEN" -> true; case "SCHEDULED" -> open!=null && !now.isBefore(open) && (close==null || now.isBefore(close)); default -> false; };
    }
    public static Instant instant(Object value) { return value==null?null:((Timestamp)value).toInstant(); }
    public static long number(Map<String,Object> row,String key) { return ((Number)row.get(key)).longValue(); }
    public Map<String,Object> check(UUID id, HttpSession session, boolean opened) {
        if(session==null) throw ApiErrors.unavailable();
        return evaluate(id,session,opened);
    }
    /** Only redeem may use this, after proving possession of the credential. */
    public Map<String,Object> checkCredential(UUID id,String tokenHash) {
        var invitation=evaluate(id,null,false);
        if(!Objects.equals(invitation.get("token_hash"),tokenHash)) throw ApiErrors.unavailable();
        return invitation;
    }
    private Map<String,Object> evaluate(UUID id,HttpSession session,boolean opened) {
        Map<String,Object> wedding=db.queryForMap("SELECT * FROM wedding WHERE id=1 FOR UPDATE");
        var rows=db.queryForList("SELECT * FROM invitations WHERE id=? FOR UPDATE",id);
        if(rows.isEmpty()) throw ApiErrors.unavailable();
        var invitation=rows.getFirst(); Instant now=Instant.now();
        if(!Boolean.TRUE.equals(wedding.get("published")) || !Boolean.TRUE.equals(invitation.get("active")) || !policy(wedding,now) || !policy(invitation,now)) throw ApiErrors.unavailable();
        if(session!=null) {
            if(!Objects.equals(session.getAttribute("grant:"+id), number(invitation,"auth_revision"))) throw ApiErrors.unavailable();
            if(opened && !Objects.equals(session.getAttribute("open:"+id), marker(wedding,invitation))) throw ApiErrors.unavailable();
        }
        return invitation;
    }
    public String marker(Map<String,Object> wedding,Map<String,Object> invitation) { return wedding.get("version")+":"+invitation.get("version"); }
    public static boolean policy(Map<String,Object> row,Instant now) { return allows((String)row.get("mode"),instant(row.get("open_at")),instant(row.get("close_at")),now); }
}