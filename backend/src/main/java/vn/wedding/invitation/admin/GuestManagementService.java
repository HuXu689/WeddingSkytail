package vn.wedding.invitation.admin;

import java.util.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.wedding.invitation.access.AccessGate;
import vn.wedding.invitation.common.ApiErrors;
import static vn.wedding.invitation.access.AccessGate.number;

@Service
@Transactional
public class GuestManagementService {
    private final JdbcTemplate db;
    public GuestManagementService(JdbcTemplate db){this.db=db;}
    /** Bulk changes share the wedding row lock with AdminService so a global policy flip cannot interleave (docs/13 §5). */
    private Map<String,Object> lockWedding(){return db.queryForMap("SELECT * FROM wedding WHERE id=1 FOR UPDATE");}
    private void audit(String action,Object target){db.update("INSERT INTO audit(action,target,actor) VALUES(?,?,?)",action,target.toString(),actor());}
    /** Actions are attributed to the account that performed them, not just to "the owner" (T25). */
    private static String actor(){var authentication=SecurityContextHolder.getContext().getAuthentication();return authentication==null||authentication.getName()==null?"owner":authentication.getName();}
    public record Assignment(@NotNull UUID eventId,@Min(1) @Max(20) int maxPeople){}
    /** Effective access state is computed at request time; the database only stores mode/window (docs/13 §3). */
    private static final String GLOBAL_OPEN="(SELECT (published AND (mode='MANUAL_OPEN' OR (mode='SCHEDULED' AND open_at IS NOT NULL AND now()>=open_at AND (close_at IS NULL OR now()<close_at)))) FROM wedding WHERE id=1)";
    private static final String ACCESS_STATE="case when i.active=false then 'REVOKED' when not "+GLOBAL_OPEN+" then 'CLOSED_GLOBAL' when i.mode='MANUAL_CLOSED' then 'CLOSED_MANUAL' when i.mode='SCHEDULED' and i.open_at is not null and now()<i.open_at then 'NOT_YET_OPEN' when i.mode='SCHEDULED' and i.close_at is not null and now()>=i.close_at then 'CLOSED_SCHEDULE' else 'OPEN' end";
    private static final Set<String> ACCESS_STATES=Set.of("OPEN","NOT_YET_OPEN","CLOSED_SCHEDULE","CLOSED_MANUAL","CLOSED_GLOBAL","REVOKED");
    public record Update(@NotBlank @Size(max=200) String displayName,@NotNull @Size(max=100) String groupName,@NotBlank @Size(max=80) String salutation,@NotNull @Size(max=1000) String internalNote,@NotEmpty @Size(max=20) List<@Valid Assignment> assignments,long expectedVersion){}
    public List<Map<String,Object>> list(int page,String query,Boolean archived,UUID eventId,String responseStatus,String accessState,String openFilter){
        ApiErrors.require(page>=0&&page<=100000,"Trang không hợp lệ.");
        StringBuilder sql=new StringBuilder("SELECT i.id,i.display_name,i.group_name,i.salutation,i.internal_note,i.archived,i.active,i.mode,i.open_at,i.close_at,i.sent,i.version,now() server_now,"+ACCESS_STATE+" access_state,(SELECT min(opened_at) FROM open_events o WHERE o.invitation_id=i.id) first_opened_at,(SELECT max(opened_at) FROM open_events o WHERE o.invitation_id=i.id) last_opened_at,(SELECT count(*) FROM open_events o WHERE o.invitation_id=i.id) open_count,coalesce((SELECT p.enabled FROM invitation_pin_protection p WHERE p.invitation_id=i.id),false) pin_enabled,(SELECT string_agg(e.title,' · ' ORDER BY e.start_at) FROM assignments a2 JOIN events e ON e.id=a2.event_id WHERE a2.invitation_id=i.id AND e.state<>'CANCELLED') assigned_events,coalesce((SELECT sum(r2.total_people) FROM responses r2 WHERE r2.invitation_id=i.id AND r2.status='ATTENDING'),0) confirmed_people,(SELECT count(*) FROM responses r2 WHERE r2.invitation_id=i.id AND r2.status='ATTENDING') attending_events,(SELECT count(*) FROM responses r2 WHERE r2.invitation_id=i.id AND r2.status='DECLINED') declined_events FROM invitations i");
        List<Object> args=new ArrayList<>();List<String> where=new ArrayList<>();
        if(archived!=null){where.add("i.archived=?");args.add(archived);}if(query!=null&&!query.isBlank()){where.add("(i.display_name ILIKE ? OR i.group_name ILIKE ? OR i.internal_note ILIKE ?)");String q="%"+query.strip()+"%";args.add(q);args.add(q);args.add(q);}if(eventId!=null){where.add("EXISTS (SELECT 1 FROM assignments af WHERE af.invitation_id=i.id AND af.event_id=?)");args.add(eventId);}if(responseStatus!=null&&!responseStatus.isBlank()){where.add("EXISTS (SELECT 1 FROM responses rf WHERE rf.invitation_id=i.id AND rf.status=?)");args.add(responseStatus);}if(accessState!=null&&!accessState.isBlank()){ApiErrors.require(ACCESS_STATES.contains(accessState),"Trạng thái truy cập không hợp lệ.");where.add("("+ACCESS_STATE+")=?");args.add(accessState);}if(openFilter!=null&&!openFilter.isBlank()){where.add(openCondition(openFilter,eventId,args));}
        if(!where.isEmpty())sql.append(" WHERE ").append(String.join(" AND ",where));sql.append(" ORDER BY i.display_name,i.id LIMIT 50 OFFSET ?");args.add(page*50);return db.queryForList(sql.toString(),args.toArray());
    }
    /** Recorded openings only; a missing record never proves the recipient did not read (docs/13 §10). */
    private static String openCondition(String filter,UUID eventId,List<Object> args){
        return switch(filter){
            case "NO_OPEN" -> "NOT EXISTS (SELECT 1 FROM open_events o WHERE o.invitation_id=i.id)";
            case "OPENED" -> "EXISTS (SELECT 1 FROM open_events o WHERE o.invitation_id=i.id)";
            case "OPENED_NO_RESPONSE" -> { ApiErrors.require(eventId!=null,"Hãy chọn buổi tiệc để lọc khách đã mở thiệp nhưng chưa phản hồi."); args.add(eventId); args.add(eventId); yield "EXISTS (SELECT 1 FROM open_events o WHERE o.invitation_id=i.id) AND EXISTS (SELECT 1 FROM assignments af2 WHERE af2.invitation_id=i.id AND af2.event_id=?) AND NOT EXISTS (SELECT 1 FROM responses rf2 WHERE rf2.invitation_id=i.id AND rf2.event_id=?)"; }
            case "SCHEDULED_UPCOMING" -> "i.active AND ("+ACCESS_STATE+")='NOT_YET_OPEN'";
            default -> throw new IllegalArgumentException("Bộ lọc lượt mở không hợp lệ.");
        };
    }
    /** One unit per invitation; recorded openings are sessions and never a head count (docs/02 §22). */
    public Map<String,Object> linkStats(UUID eventId){
        var counts=db.queryForMap("SELECT count(*) FILTER (WHERE ("+ACCESS_STATE+")='OPEN') open_parties,count(*) FILTER (WHERE ("+ACCESS_STATE+")='CLOSED_GLOBAL') closed_global,count(*) FILTER (WHERE ("+ACCESS_STATE+")='CLOSED_MANUAL') closed_manual,count(*) FILTER (WHERE ("+ACCESS_STATE+")='CLOSED_SCHEDULE') closed_schedule,count(*) FILTER (WHERE ("+ACCESS_STATE+")='NOT_YET_OPEN') not_yet_open,count(*) FILTER (WHERE ("+ACCESS_STATE+")='REVOKED') revoked_parties,count(*) FILTER (WHERE i.active AND NOT EXISTS (SELECT 1 FROM open_events o WHERE o.invitation_id=i.id)) no_open_record,count(*) FILTER (WHERE EXISTS (SELECT 1 FROM open_events o WHERE o.invitation_id=i.id)) opened_record FROM invitations i WHERE i.archived=false");
        var result=new HashMap<String,Object>(counts);
        result.put("serverNow",java.time.Instant.now().toString());
        result.put("openedNoResponse",eventId==null?null:db.queryForObject("SELECT count(*) FROM invitations i WHERE i.active AND i.archived=false AND EXISTS (SELECT 1 FROM open_events o WHERE o.invitation_id=i.id) AND EXISTS (SELECT 1 FROM assignments a WHERE a.invitation_id=i.id AND a.event_id=?) AND NOT EXISTS (SELECT 1 FROM responses r WHERE r.invitation_id=i.id AND r.event_id=?)",Long.class,eventId,eventId));
        return result;
    }
    /** Effective access state for one invitation, mirroring the SQL evaluator used by the list query. */
    private static String stateOf(Map<String,Object> wedding,Map<String,Object> invitation,java.time.Instant now){
        if(!Boolean.TRUE.equals(invitation.get("active"))) return "REVOKED";
        if(!Boolean.TRUE.equals(wedding.get("published"))||!AccessGate.policy(wedding,now)) return "CLOSED_GLOBAL";
        Object mode=invitation.get("mode");
        if("MANUAL_CLOSED".equals(mode)) return "CLOSED_MANUAL";
        if("SCHEDULED".equals(mode)) {
            java.time.Instant open=AccessGate.instant(invitation.get("open_at")),close=AccessGate.instant(invitation.get("close_at"));
            if(open!=null&&now.isBefore(open)) return "NOT_YET_OPEN";
            if(close!=null&&!now.isBefore(close)) return "CLOSED_SCHEDULE";
        }
        return "OPEN";
    }
    public record BulkRequest(List<UUID> ids,String mode,java.time.Instant openAt,java.time.Instant closeAt,boolean dryRun,Map<String,Long> expectedVersions){}
    /**
     * Bulk access policy (FR18, docs/13 §5): preview first, then apply with the versions the preview returned.
     * Never rotates a token, so printed QR codes keep working.
     */
    public Map<String,Object> bulkPolicy(BulkRequest input){
        ApiErrors.require(input.ids()!=null&&!input.ids().isEmpty()&&input.ids().size()<=300,"Chọn từ 1 đến 300 lời mời.");
        ApiErrors.require(Set.of("MANUAL_OPEN","MANUAL_CLOSED","SCHEDULED").contains(input.mode()),"Chế độ áp dụng không hợp lệ.");
        ApiErrors.require(!"SCHEDULED".equals(input.mode())||(input.openAt()!=null&&(input.closeAt()==null||input.closeAt().isAfter(input.openAt()))),"Lịch mở/đóng không hợp lệ.");
        var wedding=lockWedding();
        List<UUID> ids=input.ids().stream().distinct().sorted().toList();
        var rows=db.queryForList("SELECT id,display_name,active,archived,mode,open_at,close_at,version FROM invitations WHERE id=ANY(?::uuid[]) FOR UPDATE",(Object)ids.toArray(new UUID[0]));
        var found=new HashSet<UUID>(); for(var row:rows) found.add((UUID)row.get("id"));
        var missing=new ArrayList<String>(); for(var id:ids) if(!found.contains(id)) missing.add(id.toString());
        java.time.Instant now=java.time.Instant.now();
        Object open=input.openAt()==null?null:java.sql.Timestamp.from(input.openAt());
        Object close=input.closeAt()==null?null:java.sql.Timestamp.from(input.closeAt());
        var applicable=new ArrayList<Map<String,Object>>(); var conflicts=new ArrayList<Map<String,Object>>(); var versions=new HashMap<String,Long>();
        int blocking=0,opening=0;
        for(var row:rows){
            UUID id=(UUID)row.get("id"); versions.put(id.toString(),number(row,"version"));
            String before=stateOf(wedding,row,now);
            var next=new HashMap<String,Object>(row); next.put("mode",input.mode()); next.put("open_at",open); next.put("close_at",close);
            String after=stateOf(wedding,next,now);
            if("OPEN".equals(before)&&!"OPEN".equals(after)) blocking++;
            if(!"OPEN".equals(before)&&"OPEN".equals(after)) opening++;
            Long expected=input.expectedVersions()==null?null:input.expectedVersions().get(id.toString());
            if("REVOKED".equals(before)) conflicts.add(Map.of("id",id.toString(),"displayName",row.get("display_name"),"reason","REVOKED"));
            else if(expected!=null&&expected!=number(row,"version")) conflicts.add(Map.of("id",id.toString(),"displayName",row.get("display_name"),"reason","STALE"));
            else applicable.add(Map.of("id",id.toString(),"displayName",row.get("display_name"),"beforeState",before,"afterState",after,"version",number(row,"version")));
        }
        var result=new HashMap<String,Object>();
        result.put("mode",input.mode()); result.put("dryRun",input.dryRun()); result.put("selected",ids.size());
        result.put("applicable",applicable.size()); result.put("skipped",missing.size()+conflicts.size());
        result.put("missing",missing); result.put("conflicts",conflicts); result.put("rows",applicable);
        result.put("sessionsBlocked",blocking); result.put("willOpen",opening); result.put("qrUnchanged",true); result.put("versions",versions);
        if(input.dryRun) return result;
        ApiErrors.require(missing.isEmpty()&&conflicts.isEmpty(),"Có lời mời không còn phù hợp hoặc đã thay đổi. Hãy xem trước lại rồi áp dụng.");
        for(var row:rows) db.update("UPDATE invitations SET mode=?,open_at=?,close_at=?,version=version+1 WHERE id=?",input.mode(),open,close,row.get("id"));
        audit("ACCESS_BULK_"+input.mode(),rows.size()+" lời mời"); result.put("applied",rows.size());
        return result;
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