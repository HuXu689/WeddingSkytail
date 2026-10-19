package vn.wedding.invitation.wedding;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.wedding.invitation.common.ApiErrors;
import vn.wedding.invitation.common.Texts;
import static vn.wedding.invitation.access.AccessGate.number;

@Service
public class SectionService {
    private final JdbcTemplate db;
    public SectionService(JdbcTemplate db){this.db=db;}
    public record Section(String kind,String audience,boolean enabled,String title,String body,Instant startsAt,String color) {}
    public record Input(List<Section> sections,int templateVersion,int contentSchemaVersion,long expectedVersion) {}
    public static void validate(Input input){
        ApiErrors.require(input!=null&&input.templateVersion()==1&&input.contentSchemaVersion()==1,"Phiên bản cấu hình không được hỗ trợ.");
        ApiErrors.require(input.sections()!=null&&input.sections().size()<=20,"Tối đa 20 mục nội dung.");
        var times=new HashSet<Instant>();
        for(var section:input.sections()){
            ApiErrors.require(section!=null,"Mục nội dung không hợp lệ.");
            ApiErrors.require(Set.of("INTRO","FAMILY","CEREMONY","TIMELINE","DRESS_CODE").contains(Objects.toString(section.kind(),"")),"Loại nội dung không hợp lệ.");
            ApiErrors.require(Set.of("PUBLIC","PRIVATE").contains(Objects.toString(section.audience(),"")),"Quyền xem không hợp lệ.");
            ApiErrors.require(section.title()!=null&&!Texts.oneLine(section.title()).isBlank()&&section.title().length()<=200,"Nhập tiêu đề tối đa 200 ký tự.");
            ApiErrors.require(section.body()!=null&&section.body().length()<=2000,"Nội dung tối đa 2.000 ký tự.");
            ApiErrors.require(section.color()==null||section.color().matches("#[0-9a-fA-F]{6}"),"Màu không hợp lệ.");
            if("TIMELINE".equals(section.kind())){
                ApiErrors.require(section.startsAt()!=null,"Mốc lịch trình cần thời điểm cụ thể.");
                if(section.enabled())ApiErrors.require(times.add(section.startsAt()),"Hai mốc lịch trình đang bật không được trùng thời điểm.");
            }
            if("DRESS_CODE".equals(section.kind())&&section.enabled())ApiErrors.require(!section.body().isBlank(),"Hướng dẫn trang phục cần tên màu bằng chữ và nội dung hướng dẫn.");
        }
    }
    @Transactional public void save(Input input){
        validate(input);
        ApiErrors.version(number(db.queryForMap("SELECT * FROM wedding WHERE id=1 FOR UPDATE"),"version"),input.expectedVersion());
        db.update("DELETE FROM wedding_sections WHERE surface='DRAFT'");
        for(int i=0;i<input.sections().size();i++){
            var s=input.sections().get(i);
            db.update("INSERT INTO wedding_sections(surface,position,kind,audience,enabled,title,body,starts_at,color) VALUES('DRAFT',?,?,?,?,?,?,?,?)",i,s.kind(),s.audience(),s.enabled(),Texts.oneLine(s.title()),Texts.text(s.body()),s.startsAt()==null?null:Timestamp.from(s.startsAt()),s.color());
        }
        db.update("UPDATE wedding SET version=version+1 WHERE id=1");
        db.update("INSERT INTO audit(action,target,actor) VALUES('WEDDING_SECTIONS','1',?)",org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication()==null?"owner":org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName());
    }
    public List<Map<String,Object>> list(boolean draft,boolean privateView){
        return list(db,draft,privateView);
    }
    public static List<Map<String,Object>> list(JdbcTemplate db,boolean draft,boolean privateView){
        return db.queryForList("SELECT kind,audience,enabled,title,body,starts_at AS \"startsAt\",color FROM wedding_sections WHERE surface=?"+(draft?"":" AND enabled=true"+(privateView?"":" AND audience='PUBLIC'"))+" ORDER BY position",draft?"DRAFT":"PUBLISHED");
    }
}