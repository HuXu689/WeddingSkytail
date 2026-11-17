package vn.wedding.invitation.wedding;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;
import vn.wedding.invitation.common.ApiErrors;
import vn.wedding.invitation.common.Texts;
import static vn.wedding.invitation.access.AccessGate.number;

/**
 * Nội dung tùy chọn của thiệp: INTRO, FAMILY, CEREMONY, TIMELINE, DRESS_CODE.
 *
 * <p>Hai lớp dữ liệu: cột phẳng cũ (title/body/starts_at/color) cho hàng lưu trước V22, và cột
 * `payload` JSON có cấu trúc cho nội dung mới. Server là nơi quyết định quyền: bản công khai không
 * bao giờ nhận mục audience=PRIVATE và mốc lịch trình riêng bị lọc khỏi payload trước khi trả về.
 * Trường trong payload được whitelist và chuẩn hoá NFC ở biên ghi.
 */
@Service
public class SectionService {
    /** Spring Boot 4 dùng Jackson 3 (tools.jackson.*) để đọc/ghi payload jsonb. */
    private static final JsonMapper JSON=JsonMapper.builder().build();
    private static final Set<String> KINDS=Set.of("INTRO","FAMILY","CEREMONY","TIMELINE","DRESS_CODE");
    private static final Set<String> AUDIENCES=Set.of("PUBLIC","PRIVATE");
    private static final Set<String> SIDES=Set.of("GROOM","BRIDE","JOINT");
    private static final String HEX="^#[0-9a-fA-F]{6}$";
    private static final java.util.regex.Pattern SAFE_MEDIA_PATH=java.util.regex.Pattern.compile(
        "^(?:/media/[0-9a-fA-F-]{36}(?:-thumb)?\\.jpg|/api/v1/admin/media/[0-9a-fA-F-]{36}/(?:content|thumb)|/fallback/[a-zA-Z0-9_-]+\\.(?:jpg|jpeg|png|svg))$");
    private static final java.util.regex.Pattern ADMIN_MEDIA_CONTENT=java.util.regex.Pattern.compile(
        "^/api/v1/admin/media/([0-9a-fA-F-]{36})/(?:content|thumb)$");
    private final JdbcTemplate db;
    public SectionService(JdbcTemplate db){this.db=db;}

    public record Section(String kind,String audience,boolean enabled,String title,String body,Instant startsAt,String color,Map<String,Object> payload) {}
    public record Input(List<Section> sections,int templateVersion,int contentSchemaVersion,long expectedVersion) {}

    /** Payload coi như không có khi null hoặc rỗng. */
    static boolean absent(Map<String,Object> payload){ return payload==null||payload.isEmpty(); }
    private static Map<String,Object> obj(Object value){
        if(!(value instanceof Map<?,?> map)) return null;
        var result=new LinkedHashMap<String,Object>();
        map.forEach((key,item)->result.put(String.valueOf(key),item));
        return result;
    }
    private static List<Object> items(Object value){ return value instanceof List<?> list?new ArrayList<>(list):List.of(); }
    private static String str(Map<String,Object> node,String name){ Object value=node==null?null:node.get(name); return value instanceof String text?text:null; }
    private static boolean flag(Map<String,Object> node,String name){ return node!=null&&Boolean.TRUE.equals(node.get(name)); }
    private static void requireObject(Map<String,Object> node,String message){ ApiErrors.require(node!=null,message); }
    private static String requiredText(Map<String,Object> node,String name,int max,String label){
        String value=str(node,name);
        ApiErrors.require(value!=null&&!Texts.oneLine(value).isBlank(),label+" không được để trống.");
        ApiErrors.require(value.length()<=max,label+" tối đa "+max+" ký tự.");
        return value;
    }
    private static String optionalText(Map<String,Object> node,String name,int max,String label){
        String value=str(node,name);
        if(value==null||value.isBlank()) return null;
        ApiErrors.require(value.length()<=max,label+" tối đa "+max+" ký tự.");
        return value;
    }
    private static Instant parseInstant(String value){ try{ return Instant.parse(value.trim()); }catch(RuntimeException error){ return null; } }
    private static Instant instant(Map<String,Object> node,String name,String label){
        String value=str(node,name);
        if(value==null||value.isBlank()) return null;
        Instant parsed=parseInstant(value);
        ApiErrors.require(parsed!=null,label+" không phải thời điểm hợp lệ.");
        return parsed;
    }

    /** Thời điểm hiệu lực của mục TIMELINE: danh sách mốc mới, hoặc starts_at của hàng cũ. */
    private static List<Instant> milestones(Section section){
        var rows=items(section.payload()==null?null:section.payload().get("timeline"));
        if(!rows.isEmpty()){
            var result=new ArrayList<Instant>(rows.size());
            for(var row:rows){ var item=obj(row); if(item!=null){ var at=parseInstant(str(item,"at")==null?"":str(item,"at")); if(at!=null) result.add(at); } }
            return result;
        }
        return section.startsAt()==null?List.of():List.of(section.startsAt());
    }
    private static Instant firstMilestone(Section section){ var all=milestones(section); return all.isEmpty()?null:all.getFirst(); }

    public static void validate(Input input){
        ApiErrors.require(input!=null&&input.templateVersion()==1&&(input.contentSchemaVersion()==1||input.contentSchemaVersion()==2),"Phiên bản cấu hình không được hỗ trợ.");
        ApiErrors.require(input.sections()!=null&&input.sections().size()<=20,"Tối đa 20 mục nội dung.");
        boolean structured=input.contentSchemaVersion()==2;
        var times=new HashSet<Instant>();
        for(var section:input.sections()){
            ApiErrors.require(section!=null,"Mục nội dung không hợp lệ.");
            String kind=Objects.toString(section.kind(),"");
            ApiErrors.require(KINDS.contains(kind),"Loại nội dung không hợp lệ.");
            ApiErrors.require(AUDIENCES.contains(Objects.toString(section.audience(),"")),"Quyền xem không hợp lệ.");
            ApiErrors.require(section.title()!=null&&!Texts.oneLine(section.title()).isBlank()&&section.title().length()<=200,"Nhập tiêu đề tối đa 200 ký tự.");
            ApiErrors.require(section.body()!=null&&section.body().length()<=2000,"Nội dung tối đa 2.000 ký tự.");
            ApiErrors.require(section.color()==null||section.color().matches(HEX),"Màu không hợp lệ.");
            if(!structured) ApiErrors.require(absent(section.payload()),"Nội dung có cấu trúc cần phiên bản cấu hình 2.");
            else validatePayload(kind,section.payload());
            if("TIMELINE".equals(kind)){
                ApiErrors.require(firstMilestone(section)!=null,"Mốc lịch trình cần thời điểm cụ thể.");
                if(section.enabled()) for(var at:milestones(section)) ApiErrors.require(times.add(at),"Hai mốc lịch trình đang bật không được trùng thời điểm.");
            }
            if("DRESS_CODE".equals(kind)&&section.enabled()) ApiErrors.require(section.body()!=null&&!section.body().isBlank(),"Hướng dẫn trang phục cần tên màu bằng chữ và nội dung hướng dẫn.");
        }
    }

    private static String optionalMediaPath(Map<String,Object> node,String name,String label){
        String value=str(node,name);
        if(value==null||value.isBlank()) return null;
        String trimmed=value.trim();
        ApiErrors.require(trimmed.length()<=240&&SAFE_MEDIA_PATH.matcher(trimmed).matches(),label+" phải chọn từ thư viện ảnh nội bộ hoặc ảnh dự phòng.");
        return trimmed;
    }
    private static String optionalSide(Map<String,Object> node,String label){
        String value=str(node,"side");
        if(value==null||value.isBlank()) return null;
        String trimmed=value.trim();
        ApiErrors.require(SIDES.contains(trimmed),label+" không hợp lệ.");
        return trimmed;
    }
    private static String optionalMapsUrl(Map<String,Object> node){
        String value=str(node,"mapsUrl");
        if(value==null||value.isBlank()) return null;
        return vn.wedding.invitation.admin.AdminService.cleanMapsUrl(value);
    }

    /** Whitelist từng loại: khoá lạ, số lượng vượt giới hạn và mã màu sai đều bị từ chối. */
    private static void validatePayload(String kind,Map<String,Object> payload){
        if(absent(payload)) return;
        switch(kind){
            case "INTRO" -> {
                var people=items(payload.get("people"));
                ApiErrors.require(people.size()<=4,"Tối đa 4 người trong phần giới thiệu.");
                for(var row:people){
                    var person=obj(row); requireObject(person,"Thông tin người không hợp lệ.");
                    requiredText(person,"name",200,"Tên hiển thị");
                    optionalText(person,"role",80,"Cách gọi");
                    optionalText(person,"note",600,"Mô tả ngắn");
                    optionalText(person,"quote",300,"Câu trích dẫn");
                    optionalMediaPath(person,"avatarUrl","Ảnh chân dung");
                }
                var milestones=items(payload.get("milestones"));
                ApiErrors.require(milestones.size()<=12,"Tối đa 12 cột mốc kỷ niệm tình yêu.");
                for(var row:milestones){
                    var item=obj(row); requireObject(item,"Cột mốc kỷ niệm không hợp lệ.");
                    requiredText(item,"dateLabel",80,"Thời gian cột mốc");
                    requiredText(item,"title",200,"Tên cột mốc");
                    optionalText(item,"description",800,"Câu chuyện cột mốc");
                    optionalMediaPath(item,"photoUrl","Ảnh cột mốc");
                }
            }
            case "FAMILY" -> {
                var groups=items(payload.get("groups"));
                ApiErrors.require(groups.size()<=6,"Tối đa 6 nhóm gia đình.");
                for(var row:groups){
                    var group=obj(row); requireObject(group,"Nhóm gia đình không hợp lệ.");
                    optionalText(group,"label",80,"Nhãn nhóm");
                    optionalSide(group,"Phân nhánh gia đình");
                    optionalText(group,"location",240,"Địa chỉ tư gia");
                    optionalText(group,"welcomeNote",400,"Lời đón tiếp gia đình");
                    var members=items(group.get("members"));
                    ApiErrors.require(members.size()<=12,"Tối đa 12 thành viên mỗi nhóm.");
                    for(var memberRow:members){ var member=obj(memberRow); requireObject(member,"Thành viên không hợp lệ."); requiredText(member,"name",200,"Tên thành viên"); optionalText(member,"note",200,"Quan hệ hoặc ghi chú"); }
                }
            }
            case "CEREMONY" -> {
                var ceremonies=items(payload.get("items"));
                ApiErrors.require(ceremonies.size()<=6,"Tối đa 6 nghi lễ.");
                for(var row:ceremonies){
                    var item=obj(row); requireObject(item,"Nghi lễ không hợp lệ.");
                    requiredText(item,"title",200,"Tên nghi lễ");
                    optionalSide(item,"Phân nhánh nghi lễ");
                    optionalText(item,"lead",600,"Lời dẫn");
                    instant(item,"time","Thời điểm nghi lễ");
                    optionalText(item,"venue",200,"Địa điểm");
                    optionalText(item,"address",500,"Địa chỉ");
                    optionalText(item,"directions",500,"Hướng dẫn di chuyển");
                    optionalMapsUrl(item);
                    optionalText(item,"dressNote",240,"Ghi chú trang phục nghi lễ");
                }
            }
            case "TIMELINE" -> {
                var rows=items(payload.get("timeline"));
                ApiErrors.require(rows.size()<=20,"Tối đa 20 mốc lịch trình.");
                for(var row:rows){
                    var item=obj(row); requireObject(item,"Mốc lịch trình không hợp lệ.");
                    ApiErrors.require(instant(item,"at","Thời điểm mốc")!=null,"Mỗi mốc lịch trình cần ngày giờ cụ thể.");
                    requiredText(item,"title",200,"Tên mốc");
                    optionalText(item,"note",600,"Mô tả mốc");
                    optionalText(item,"venue",200,"Địa điểm mốc");
                    optionalSide(item,"Phân nhánh mốc lịch trình");
                    optionalMapsUrl(item);
                    var audience=str(item,"audience");
                    ApiErrors.require(audience==null||AUDIENCES.contains(audience),"Quyền xem của mốc không hợp lệ.");
                }
            }
            case "DRESS_CODE" -> {
                var palette=items(payload.get("palette"));
                ApiErrors.require(palette.size()<=8,"Tối đa 8 màu trong bảng màu.");
                for(var row:palette){ var color=obj(row); requireObject(color,"Màu không hợp lệ."); requiredText(color,"name",80,"Tên màu"); var hex=str(color,"color"); ApiErrors.require(hex!=null&&hex.matches(HEX),"Mã màu phải theo dạng #RRGGBB."); }
                optionalText(payload,"avoid",600,"Danh sách nên tránh");
                var tips=items(payload.get("tips"));
                ApiErrors.require(tips.size()<=8,"Tối đa 8 mục lưu ý khách mời.");
                for(var row:tips){
                    var tip=obj(row); requireObject(tip,"Lưu ý khách mời không hợp lệ.");
                    requiredText(tip,"title",120,"Tiêu đề lưu ý");
                    requiredText(tip,"detail",500,"Nội dung lưu ý");
                }
            }
            default -> throw new IllegalStateException("Loại nội dung không hợp lệ.");
        }
    }

    /** Chỉ ghi trường đã biết và chuẩn hoá NFC; khoá lạ không được lưu vào DB. Public cho test và lớp lưu. */
    public static Map<String,Object> normalized(String kind,Map<String,Object> payload){
        if(absent(payload)) return null;
        var result=new LinkedHashMap<String,Object>();
        switch(kind){
            case "INTRO" -> {
                var people=new ArrayList<Object>();
                for(var row:items(payload.get("people"))){
                    var person=obj(row); var target=new LinkedHashMap<String,Object>();
                    target.put("name",Texts.oneLine(str(person,"name")));
                    putOptional(target,"role",str(person,"role"),80);
                    putOptional(target,"note",str(person,"note"),600);
                    putOptional(target,"quote",str(person,"quote"),300);
                    String avatarUrl=optionalMediaPath(person,"avatarUrl","Ảnh chân dung");
                    if(avatarUrl!=null) target.put("avatarUrl",avatarUrl);
                    people.add(target);
                }
                result.put("people",people);
                var milestones=new ArrayList<Object>();
                for(var row:items(payload.get("milestones"))){
                    var item=obj(row); var target=new LinkedHashMap<String,Object>();
                    target.put("dateLabel",Texts.oneLine(str(item,"dateLabel")));
                    target.put("title",Texts.oneLine(str(item,"title")));
                    putOptional(target,"description",str(item,"description"),800);
                    String photoUrl=optionalMediaPath(item,"photoUrl","Ảnh cột mốc");
                    if(photoUrl!=null) target.put("photoUrl",photoUrl);
                    milestones.add(target);
                }
                if(!milestones.isEmpty()) result.put("milestones",milestones);
            }
            case "FAMILY" -> {
                var groups=new ArrayList<Object>();
                for(var row:items(payload.get("groups"))){
                    var group=obj(row); var target=new LinkedHashMap<String,Object>();
                    putOptional(target,"label",str(group,"label"),80);
                    String side=optionalSide(group,"Phân nhánh gia đình");
                    if(side!=null) target.put("side",side);
                    putOptional(target,"location",str(group,"location"),240);
                    putOptional(target,"welcomeNote",str(group,"welcomeNote"),400);
                    var members=new ArrayList<Object>();
                    for(var memberRow:items(group.get("members"))){
                        var member=obj(memberRow); var entry=new LinkedHashMap<String,Object>();
                        entry.put("name",Texts.oneLine(str(member,"name")));
                        putOptional(entry,"note",str(member,"note"),200);
                        members.add(entry);
                    }
                    target.put("members",members);
                    groups.add(target);
                }
                result.put("groups",groups);
            }
            case "CEREMONY" -> {
                var ceremonies=new ArrayList<Object>();
                for(var row:items(payload.get("items"))){
                    var item=obj(row); var target=new LinkedHashMap<String,Object>();
                    target.put("title",Texts.oneLine(str(item,"title")));
                    String side=optionalSide(item,"Phân nhánh nghi lễ");
                    if(side!=null) target.put("side",side);
                    putOptional(target,"lead",str(item,"lead"),600);
                    var time=instant(item,"time","Thời điểm nghi lễ");
                    if(time!=null) target.put("time",time.toString());
                    putOptional(target,"venue",str(item,"venue"),200);
                    putOptional(target,"address",str(item,"address"),500);
                    putOptional(target,"directions",str(item,"directions"),500);
                    String mapsUrl=optionalMapsUrl(item);
                    if(mapsUrl!=null) target.put("mapsUrl",mapsUrl);
                    putOptional(target,"dressNote",str(item,"dressNote"),240);
                    ceremonies.add(target);
                }
                result.put("items",ceremonies);
            }
            case "TIMELINE" -> {
                var milestones=new ArrayList<Object>();
                for(var row:items(payload.get("timeline"))){
                    var item=obj(row); var target=new LinkedHashMap<String,Object>();
                    target.put("at",instant(item,"at","Thời điểm mốc").toString());
                    target.put("title",Texts.oneLine(str(item,"title")));
                    putOptional(target,"note",str(item,"note"),600);
                    putOptional(target,"venue",str(item,"venue"),200);
                    String side=optionalSide(item,"Phân nhánh mốc lịch trình");
                    if(side!=null) target.put("side",side);
                    String mapsUrl=optionalMapsUrl(item);
                    if(mapsUrl!=null) target.put("mapsUrl",mapsUrl);
                    target.put("audience","PRIVATE".equals(str(item,"audience"))?"PRIVATE":"PUBLIC");
                    if(flag(item,"tentative")) target.put("tentative",true);
                    milestones.add(target);
                }
                result.put("timeline",milestones);
            }
            case "DRESS_CODE" -> {
                var palette=new ArrayList<Object>();
                for(var row:items(payload.get("palette"))){
                    var color=obj(row); var target=new LinkedHashMap<String,Object>();
                    target.put("name",Texts.oneLine(str(color,"name")));
                    target.put("color",str(color,"color"));
                    palette.add(target);
                }
                result.put("palette",palette);
                putOptional(result,"avoid",str(payload,"avoid"),600);
                var tips=new ArrayList<Object>();
                for(var row:items(payload.get("tips"))){
                    var tip=obj(row); var target=new LinkedHashMap<String,Object>();
                    target.put("title",Texts.oneLine(str(tip,"title")));
                    target.put("detail",Texts.text(str(tip,"detail")).strip());
                    tips.add(target);
                }
                if(!tips.isEmpty()) result.put("tips",tips);
            }
            default -> throw new IllegalStateException("Loại nội dung không hợp lệ.");
        }
        return result;
    }
    private static void putOptional(Map<String,Object> target,String name,String value,int max){
        String trimmed=value==null?null:Texts.text(value).strip();
        if(trimmed==null||trimmed.isEmpty()) return;
        ApiErrors.require(trimmed.length()<=max,name+" quá dài.");
        target.put(name,trimmed);
    }

    @Transactional public void save(Input input){
        validate(input);
        ApiErrors.version(number(db.queryForMap("SELECT * FROM wedding WHERE id=1 FOR UPDATE"),"version"),input.expectedVersion());
        db.update("DELETE FROM wedding_sections WHERE surface='DRAFT'");
        boolean structured=false;
        for(int i=0;i<input.sections().size();i++){
            var s=input.sections().get(i);
            Map<String,Object> payload=normalized(s.kind(),s.payload());
            structured=structured||payload!=null;
            db.update("INSERT INTO wedding_sections(surface,position,kind,audience,enabled,title,body,starts_at,color,payload) VALUES('DRAFT',?,?,?,?,?,?,?,?,CAST(? AS jsonb))",
                i,s.kind(),s.audience(),s.enabled(),Texts.oneLine(s.title()),Texts.text(s.body()),s.startsAt()==null?null:Timestamp.from(s.startsAt()),s.color(),payload==null?null:JSON.writeValueAsString(payload));
        }
        db.update("UPDATE wedding SET version=version+1"+(structured?",content_schema_version=2":"")+" WHERE id=1");
        db.update("INSERT INTO audit(action,target,actor) VALUES('WEDDING_SECTIONS','1',?)",org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication()==null?"owner":org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName());
    }

    public List<Map<String,Object>> list(boolean draft,boolean privateView){ return list(db,draft,privateView); }

    /**
     * Đọc theo ngữ cảnh. Bản công khai không bao giờ nhận mục audience=PRIVATE, mục disabled, hay
     * mốc lịch trình riêng: payload được lọc ngay ở server trước khi trả về.
     */
    public static List<Map<String,Object>> list(JdbcTemplate db,boolean draft,boolean privateView){
        var rows=db.queryForList("SELECT kind,audience,enabled,title,body,starts_at AS \"startsAt\",color,payload::text AS payload FROM wedding_sections WHERE surface=?"+(draft?"":" AND enabled=true"+(privateView?"":" AND audience='PUBLIC'"))+" ORDER BY position",draft?"DRAFT":"PUBLISHED");
        var result=new ArrayList<Map<String,Object>>(rows.size());
        for(var row:rows){
            var copy=new LinkedHashMap<String,Object>(row);
            var payload=parseMap(copy.get("payload"));
            if(payload==null){ copy.put("payload",null); result.add(copy); continue; }
            if(!privateView&&"TIMELINE".equals(copy.get("kind"))){
                var milestoneRows=items(payload.get("timeline"));
                if(!milestoneRows.isEmpty()){
                    var visible=new ArrayList<Object>();
                    for(var milestoneRow:milestoneRows){ var item=obj(milestoneRow); if(item!=null&&!"PRIVATE".equals(str(item,"audience"))) visible.add(item); }
                    payload.put("timeline",visible);
                    // starts_at cũ không được rò mốc riêng ra bản công khai khi payload đã có danh sách mốc.
                    copy.put("startsAt",null);
                    if(visible.isEmpty()) continue;
                }
            }
            if(!draft&&"INTRO".equals(copy.get("kind"))){
                projectIntroMediaUrls(payload);
            }
            copy.put("payload",payload);
            result.add(copy);
        }
        return result;
    }
    private static void projectIntroMediaUrls(Map<String,Object> payload){
        var people=items(payload.get("people"));
        if(!people.isEmpty()){
            var mapped=new ArrayList<Object>(people.size());
            for(var entry:people){
                var person=obj(entry);
                if(person!=null){
                    String avatar=str(person,"avatarUrl");
                    if(avatar!=null) person.put("avatarUrl",toPublicMediaUrl(avatar));
                    mapped.add(person);
                }
            }
            payload.put("people",mapped);
        }
        var milestones=items(payload.get("milestones"));
        if(!milestones.isEmpty()){
            var mapped=new ArrayList<Object>(milestones.size());
            for(var entry:milestones){
                var item=obj(entry);
                if(item!=null){
                    String photo=str(item,"photoUrl");
                    if(photo!=null) item.put("photoUrl",toPublicMediaUrl(photo));
                    mapped.add(item);
                }
            }
            payload.put("milestones",mapped);
        }
    }
    private static String toPublicMediaUrl(String url){
        var matcher=ADMIN_MEDIA_CONTENT.matcher(url.trim());
        return matcher.matches()?"/media/"+matcher.group(1)+".jpg":url.trim();
    }
    private static Map<String,Object> parseMap(Object raw){
        if(raw==null) return null;
        try{ return obj(JSON.readValue(raw.toString(),Object.class)); }catch(RuntimeException error){ return null; }
    }
}