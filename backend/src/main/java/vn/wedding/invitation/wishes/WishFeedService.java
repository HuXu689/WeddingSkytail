package vn.wedding.invitation.wishes;

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import jakarta.servlet.http.HttpSession;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.wedding.invitation.access.AccessGate;
import vn.wedding.invitation.common.ApiErrors;

/** Read-only feed. A cursor is a position, never an authorization credential. */
@Service
@Transactional
public class WishFeedService {
    static final int PAGE_SIZE=12;
    private final JdbcTemplate db;
    private final AccessGate gate;
    public WishFeedService(JdbcTemplate db,AccessGate gate){this.db=db;this.gate=gate;}

    public record Item(UUID id,String display_name,String message,Instant created_at) {}
    public record Page(List<Item> items,String nextCursor) {}
    private record Position(Instant at,UUID id) {}

    public Page publicFeed(String slug,String cursor){
        var rows=db.queryForList("SELECT id FROM wedding WHERE slug=? AND published=true",slug);
        if(rows.isEmpty())throw ApiErrors.unavailable();
        return page(null,cursor);
    }
    public Page guestFeed(UUID invitationId,HttpSession session,String cursor){
        gate.check(invitationId,session,true);
        return page(invitationId,cursor);
    }
    private Page page(UUID invitationId,String cursor){
        Position position=decode(cursor);
        var args=new ArrayList<Object>();
        String scope="w.event_id IS NULL";
        if(invitationId!=null){
            scope="(w.event_id IS NULL OR EXISTS (SELECT 1 FROM assignments a JOIN events e ON e.id=a.event_id WHERE a.invitation_id=? AND a.event_id=w.event_id AND e.state IN ('PUBLISHED','CANCELLED')))";
            args.add(invitationId);
        }
        String after="";
        if(position!=null){after=" AND (w.created_at,w.id)<(?,?)";args.add(Timestamp.from(position.at()));args.add(position.id());}
        args.add(PAGE_SIZE+1);
        var rows=db.queryForList("SELECT w.id,w.display_name,w.message,w.created_at FROM wishes w WHERE w.state='APPROVED' AND "+scope+after+" ORDER BY w.created_at DESC,w.id DESC LIMIT ?",args.toArray());
        var items=new ArrayList<Item>();
        for(var row:rows.subList(0,Math.min(PAGE_SIZE,rows.size()))){
            items.add(new Item((UUID)row.get("id"),(String)row.get("display_name"),(String)row.get("message"),AccessGate.instant(row.get("created_at"))));
        }
        String next=null;
        if(rows.size()>PAGE_SIZE){var last=items.getLast();next=encode(last.created_at(),last.id());}
        return new Page(List.copyOf(items),next);
    }
    static String encode(Instant at,UUID id){
        return Base64.getUrlEncoder().withoutPadding().encodeToString((at+"|"+id).getBytes(StandardCharsets.UTF_8));
    }
    private static Position decode(String cursor){
        if(cursor==null)return null;
        ApiErrors.require(!cursor.isBlank()&&cursor.length()<=160,"Vị trí lời chúc không hợp lệ. Vui lòng tải lại.");
        try{
            String[] parts=new String(Base64.getUrlDecoder().decode(cursor),StandardCharsets.UTF_8).split("\\|",-1);
            if(parts.length!=2)throw new IllegalArgumentException();
            var position=new Position(Instant.parse(parts[0]),UUID.fromString(parts[1]));
            if(position.at().isBefore(Instant.parse("0001-01-01T00:00:00Z"))||position.at().isAfter(Instant.parse("9999-12-31T23:59:59.999999Z")))throw new IllegalArgumentException();
            // Reject noncanonical UUID/base64 spellings rather than accept ambiguous positions.
            if(!encode(position.at(),position.id()).equals(cursor))throw new IllegalArgumentException();
            return position;
        }catch(RuntimeException error){
            ApiErrors.require(false,"Vị trí lời chúc không hợp lệ. Vui lòng tải lại.");
            throw new IllegalStateException();
        }
    }
}