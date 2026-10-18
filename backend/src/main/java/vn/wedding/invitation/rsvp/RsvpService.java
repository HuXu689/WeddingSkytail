package vn.wedding.invitation.rsvp;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import vn.wedding.invitation.access.AccessGate;
import vn.wedding.invitation.common.ApiErrors;
import vn.wedding.invitation.invitations.TokenService;

@Service
public class RsvpService {
    private final JdbcTemplate db;
    private final AccessGate gate;
    public RsvpService(JdbcTemplate db,AccessGate gate) { this.db=db; this.gate=gate; }
    public record Input(@NotNull @Pattern(regexp="ATTENDING|DECLINED") String status,@Min(0) @Max(20) int totalPeople,@NotNull @Size(max=500) String note,@Min(0) long expectedVersion) {}
    public static void validatePeople(Input input,int max) {
        ApiErrors.require(input.status().equals("DECLINED")?input.totalPeople()==0:input.totalPeople()>=1 && input.totalPeople()<=max,"Số người không phù hợp với lời mời.");
    }
    @Transactional
    public Object save(UUID id,UUID event,UUID key,Input input,HttpSession session) {
        gate.check(id,session,true);
        var assignments=db.queryForList("SELECT a.max_people,e.state,e.deadline FROM assignments a JOIN events e ON e.id=a.event_id WHERE a.invitation_id=? AND a.event_id=? FOR UPDATE OF a,e",id,event);
        if(assignments.isEmpty()) throw ApiErrors.unavailable();
        String hash=TokenService.hash(input.status()+"\n"+input.totalPeople()+"\n"+input.expectedVersion()+"\n"+input.note());
        var prior=db.queryForList("SELECT status,total_people,note,version,payload_hash FROM idempotency WHERE invitation_id=? AND event_id=? AND request_key=?",id,event,key);
        if(!prior.isEmpty()) { ApiErrors.version(Objects.equals(prior.getFirst().get("payload_hash"),hash)?0:1,0); var result=new HashMap<>(prior.getFirst()); result.remove("payload_hash"); return result; }
        var assignment=assignments.getFirst();
        ApiErrors.require("PUBLISHED".equals(assignment.get("state")) && Instant.now().isBefore(AccessGate.instant(assignment.get("deadline"))),"Buổi tiệc đã đóng phản hồi hoặc đã hủy.");
        validatePeople(input,((Number)assignment.get("max_people")).intValue());
        var rows=db.queryForList("SELECT version FROM responses WHERE invitation_id=? AND event_id=?",id,event);
        long version=rows.isEmpty()?0:AccessGate.number(rows.getFirst(),"version"); ApiErrors.version(version,input.expectedVersion()); long next=version+1;
        db.update("INSERT INTO responses(invitation_id,event_id,status,total_people,note,version) VALUES(?,?,?,?,?,?) ON CONFLICT(invitation_id,event_id) DO UPDATE SET status=excluded.status,total_people=excluded.total_people,note=excluded.note,version=excluded.version,updated_at=now()",id,event,input.status(),input.totalPeople(),input.note(),next);
        db.update("INSERT INTO rsvp_history(invitation_id,event_id,status,total_people,note,version) VALUES(?,?,?,?,?,?)",id,event,input.status(),input.totalPeople(),input.note(),next);
        db.update("INSERT INTO idempotency(invitation_id,event_id,request_key,payload_hash,status,total_people,note,version) VALUES(?,?,?,?,?,?,?,?)",id,event,key,hash,input.status(),input.totalPeople(),input.note(),next);
        return Map.of("status",input.status(),"total_people",input.totalPeople(),"note",input.note(),"version",next);
    }
}