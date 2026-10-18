package vn.wedding.invitation.admin;

import java.util.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.wedding.invitation.common.ApiErrors;
import static vn.wedding.invitation.access.AccessGate.number;

@Service
@Transactional
public class GuestManagementService {
    private final JdbcTemplate db;
    public GuestManagementService(JdbcTemplate db){this.db=db;}
    public record Assignment(@NotNull UUID eventId,@Min(1) @Max(20) int maxPeople){}
    public record Update(@NotBlank @Size(max=200) String displayName,@NotNull @Size(max=100) String groupName,@NotBlank @Size(max=80) String salutation,@NotNull @Size(max=1000) String internalNote,@NotEmpty @Size(max=20) List<@Valid Assignment> assignments,long expectedVersion){}
    public List<Map<String,Object>> list(int page,String query,Boolean archived,UUID eventId,String responseStatus){
        ApiErrors.require(page>=0&&page<=100000,"Trang không hợp lệ.");
        StringBuilder sql=new StringBuilder("SELECT i.id,i.display_name,i.group_name,i.salutation,i.internal_note,i.archived,i.active,i.mode,i.open_at,i.close_at,i.sent,i.version,(SELECT min(opened_at) FROM open_events o WHERE o.invitation_id=i.id) first_opened_at,(SELECT max(opened_at) FROM open_events o WHERE o.invitation_id=i.id) last_opened_at FROM invitations i");
        List<Object> args=new ArrayList<>();List<String> where=new ArrayList<>();
        if(archived!=null){where.add("i.archived=?");args.add(archived);}if(query!=null&&!query.isBlank()){where.add("(i.display_name ILIKE ? OR i.group_name ILIKE ? OR i.internal_note ILIKE ?)");String q="%"+query.strip()+"%";args.add(q);args.add(q);args.add(q);}if(eventId!=null){where.add("EXISTS (SELECT 1 FROM assignments af WHERE af.invitation_id=i.id AND af.event_id=?)");args.add(eventId);}if(responseStatus!=null&&!responseStatus.isBlank()){where.add("EXISTS (SELECT 1 FROM responses rf WHERE rf.invitation_id=i.id AND rf.status=?)");args.add(responseStatus);}
        if(!where.isEmpty())sql.append(" WHERE ").append(String.join(" AND ",where));sql.append(" ORDER BY i.display_name,i.id LIMIT 50 OFFSET ?");args.add(page*50);return db.queryForList(sql.toString(),args.toArray());
    }
    public Map<String,Object> update(UUID id,Update input){
        var row=db.queryForMap("SELECT * FROM invitations WHERE id=? FOR UPDATE",id);ApiErrors.version(number(row,"version"),input.expectedVersion());ApiErrors.require(input.assignments().stream().map(Assignment::eventId).distinct().count()==input.assignments().size(),"Buổi tiệc bị trùng.");
        for(var a:input.assignments())ApiErrors.require(db.queryForObject("SELECT count(*) FROM events WHERE id=? AND state<>'CANCELLED'",Integer.class,a.eventId())==1,"Buổi tiệc không hợp lệ.");
        List<Map<String,Object>> warnings=new ArrayList<>();for(var a:input.assignments()){Integer confirmed=db.query("SELECT total_people FROM responses WHERE invitation_id=? AND event_id=? AND status='ATTENDING'",rs->rs.next()?rs.getInt(1):null,id,a.eventId());if(confirmed!=null&&confirmed>a.maxPeople())warnings.add(Map.of("eventId",a.eventId(),"confirmedPeople",confirmed,"maxPeople",a.maxPeople()));}
        List<UUID> requested=input.assignments().stream().map(Assignment::eventId).toList();
        List<Map<String,Object>> protectedRows;
        if(requested.isEmpty()) protectedRows=db.queryForList("SELECT a.event_id FROM assignments a JOIN responses r ON r.invitation_id=a.invitation_id AND r.event_id=a.event_id WHERE a.invitation_id=?",id);
        else protectedRows=db.queryForList("SELECT a.event_id FROM assignments a JOIN responses r ON r.invitation_id=a.invitation_id AND r.event_id=a.event_id WHERE a.invitation_id=? AND a.event_id<>ALL(?::uuid[])",id,requested.toArray(new UUID[0]));
        ApiErrors.require(protectedRows.isEmpty(),"Không thể bỏ buổi đã có RSVP. Hãy giữ buổi này trong lời mời hoặc xử lý RSVP trước.");
        db.update("UPDATE invitations SET display_name=?,group_name=?,salutation=?,internal_note=?,version=version+1 WHERE id=?",input.displayName(),input.groupName(),input.salutation(),input.internalNote(),id);
        for(var a:input.assignments())db.update("INSERT INTO assignments(invitation_id,event_id,max_people) VALUES(?,?,?) ON CONFLICT(invitation_id,event_id) DO UPDATE SET max_people=EXCLUDED.max_people",id,a.eventId(),a.maxPeople());
        if(requested.isEmpty())db.update("DELETE FROM assignments WHERE invitation_id=?",id);else db.update("DELETE FROM assignments WHERE invitation_id=? AND event_id<>ALL(?::uuid[])",id,requested.toArray(new UUID[0]));
        db.update("INSERT INTO audit(action,target) VALUES('INVITATION_UPDATE',?)",id);return Map.of("id",id,"warnings",warnings);
    }
    public void archive(UUID id,boolean value,long version){var row=db.queryForMap("SELECT * FROM invitations WHERE id=? FOR UPDATE",id);ApiErrors.version(number(row,"version"),version);db.update("UPDATE invitations SET archived=?,version=version+1 WHERE id=?",value,id);db.update("INSERT INTO audit(action,target) VALUES(?,?)",value?"INVITATION_ARCHIVE":"INVITATION_RESTORE",id);}
    public List<Map<String,Object>> assignments(UUID id){return db.queryForList("SELECT event_id,max_people FROM assignments WHERE invitation_id=? ORDER BY event_id",id);}
}