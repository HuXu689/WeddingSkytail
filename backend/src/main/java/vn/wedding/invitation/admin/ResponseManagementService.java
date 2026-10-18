package vn.wedding.invitation.admin;

import java.util.*;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.wedding.invitation.common.ApiErrors;
import static vn.wedding.invitation.access.AccessGate.number;

@Service
@Transactional
public class ResponseManagementService {
    private final JdbcTemplate db;
    public ResponseManagementService(JdbcTemplate db){this.db=db;}
    public record Update(@NotNull @Pattern(regexp="ATTENDING|DECLINED") String status,@Min(0) @Max(20) int totalPeople,@NotNull @Size(max=500) String note,@NotBlank @Size(max=500) String reason,long expectedVersion){}
    public static void validateReason(String reason){ApiErrors.require(reason!=null&&!reason.isBlank(),"Cần ghi lý do chỉnh sửa.");}
    public List<Map<String,Object>> list(int page,String query,String status,UUID eventId){
        ApiErrors.require(page>=0&&page<=100000,"Trang không hợp lệ.");
        StringBuilder sql=new StringBuilder("SELECT i.id invitation_id,e.id event_id,i.display_name,e.title,r.status,r.total_people,r.note,r.version,r.updated_at FROM responses r JOIN invitations i ON i.id=r.invitation_id JOIN events e ON e.id=r.event_id");List<String> where=new ArrayList<>();List<Object> args=new ArrayList<>();
        if(query!=null&&!query.isBlank()){where.add("(i.display_name ILIKE ? OR e.title ILIKE ?)");String q="%"+query.strip()+"%";args.add(q);args.add(q);}if(status!=null&&!status.isBlank()){where.add("r.status=?");args.add(status);}if(eventId!=null){where.add("e.id=?");args.add(eventId);}if(!where.isEmpty())sql.append(" WHERE ").append(String.join(" AND ",where));sql.append(" ORDER BY r.updated_at DESC,r.version DESC LIMIT 50 OFFSET ?");args.add(page*50);return db.queryForList(sql.toString(),args.toArray());
    }
    public List<Map<String,Object>> history(UUID invitationId,UUID eventId){return db.queryForList("SELECT id,status,total_people,note,version,changed_by,change_reason,created_at FROM rsvp_history WHERE invitation_id=? AND event_id=? ORDER BY id DESC",invitationId,eventId);}
    public Map<String,Object> update(UUID invitationId,UUID eventId,Update input){
        validateReason(input.reason());
        var assignment=db.queryForList("SELECT a.max_people,e.state FROM assignments a JOIN events e ON e.id=a.event_id WHERE a.invitation_id=? AND a.event_id=? FOR UPDATE OF a",invitationId,eventId);ApiErrors.require(!assignment.isEmpty(),"Khách không được gán vào buổi tiệc này.");
        ApiErrors.require(!"CANCELLED".equals(assignment.getFirst().get("state")),"Không thể sửa phản hồi của buổi tiệc đã hủy.");int maxPeople=((Number)assignment.getFirst().get("max_people")).intValue();ApiErrors.require(input.status().equals("DECLINED")?input.totalPeople()==0:input.totalPeople()>=1&&input.totalPeople()<=maxPeople,"Số người không phù hợp với lời mời.");
        var rows=db.queryForList("SELECT status,total_people,note,version FROM responses WHERE invitation_id=? AND event_id=? FOR UPDATE",invitationId,eventId);ApiErrors.require(!rows.isEmpty(),"Chưa có phản hồi cho lời mời này.");var current=rows.getFirst();ApiErrors.version(number(current,"version"),input.expectedVersion());long next=number(current,"version")+1;
        db.update("UPDATE responses SET status=?,total_people=?,note=?,version=?,updated_at=now() WHERE invitation_id=? AND event_id=?",input.status(),input.totalPeople(),input.note(),next,invitationId,eventId);db.update("INSERT INTO rsvp_history(invitation_id,event_id,status,total_people,note,version,changed_by,change_reason) VALUES(?,?,?,?,?,?,?,?)",invitationId,eventId,input.status(),input.totalPeople(),input.note(),next,"OWNER",input.reason());db.update("INSERT INTO audit(action,target) VALUES('RSVP_OWNER_UPDATE',?)",invitationId+":"+eventId);return Map.of("status",input.status(),"total_people",input.totalPeople(),"note",input.note(),"version",next);
    }
}