package vn.wedding.invitation.wedding;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.wedding.invitation.common.ApiErrors;
import static vn.wedding.invitation.access.AccessGate.number;

@Service
public class LayoutService {
    private final JdbcTemplate db;
    public LayoutService(JdbcTemplate db){this.db=db;}
    public record Item(String section,boolean enabled) {}
    public record Input(List<Item> layout,int templateVersion,int contentSchemaVersion,long expectedVersion) {}
    private static final Set<String> SECTIONS=Set.of("MUSIC","COUNTDOWN","STORY","CONTENT","ALBUM","THANKS");
    public static void validate(Input input){
        ApiErrors.require(input!=null&&input.templateVersion()==1&&input.contentSchemaVersion()==1,"Phiên bản cấu hình không được hỗ trợ.");
        ApiErrors.require(input.layout()!=null&&input.layout().size()==SECTIONS.size(),"Cấu hình phải có đủ sáu phần tùy chọn.");
        var seen=new HashSet<String>();
        for(var item:input.layout())ApiErrors.require(item!=null&&SECTIONS.contains(Objects.toString(item.section(),""))&&seen.add(item.section()),"Phần nội dung lạ hoặc trùng; không được thay đổi thông tin buổi tiệc/RSVP.");
    }
    @Transactional public void save(Input input){
        validate(input);
        ApiErrors.version(number(db.queryForMap("SELECT * FROM wedding WHERE id=1 FOR UPDATE"),"version"),input.expectedVersion());
        db.update("DELETE FROM wedding_layout WHERE surface='DRAFT'");
        for(int index=0;index<input.layout().size();index++){
            var item=input.layout().get(index);
            db.update("INSERT INTO wedding_layout(surface,position,section,enabled) VALUES('DRAFT',?,?,?)",index,item.section(),item.enabled());
        }
        db.update("UPDATE wedding SET version=version+1 WHERE id=1");
        var auth=org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        db.update("INSERT INTO audit(action,target,actor) VALUES('WEDDING_LAYOUT','1',?)",auth==null?"owner":auth.getName());
    }
    public static List<Map<String,Object>> list(JdbcTemplate db,boolean draft){
        return db.queryForList("SELECT section,enabled FROM wedding_layout WHERE surface=? ORDER BY position",draft?"DRAFT":"PUBLISHED");
    }
}