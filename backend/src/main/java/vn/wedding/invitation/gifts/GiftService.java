package vn.wedding.invitation.gifts;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.*;
import javax.imageio.ImageIO;
import jakarta.servlet.http.HttpSession;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.wedding.invitation.access.AccessGate;
import vn.wedding.invitation.common.ApiErrors;
import vn.wedding.invitation.common.Texts;

/** Gift images are immutable, lossless and never routed through public media selection. */
@Service
@Transactional
public class GiftService {
    private final JdbcTemplate db;
    private final AccessGate gate;
    public GiftService(JdbcTemplate db,AccessGate gate){this.db=db;this.gate=gate;}
    public record Recipient(String label,String description,UUID assetId) {}
    public record Input(boolean enabled,String mode,String visibility,Recipient first,Recipient second,long expectedRevision) {}
    public record Publish(long expectedRevision,long expectedPublishedRevision,boolean confirmed) {}
    public record Settings(boolean enabled,String mode,String visibility,Recipient first,Recipient second,long revision) {}
    public record Configuration(Settings draft,Settings published) {}
    public record Panel(String label,String description,UUID assetId) {}
    public record View(boolean enabled,String mode,List<Panel> recipients) {}
    private static final View OFF=new View(false,"SINGLE",List.of());

    private static void owner(){
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth==null||!auth.isAuthenticated()||auth.getAuthorities().stream().noneMatch(a->"ROLE_OWNER".equals(a.getAuthority())))
            throw ApiErrors.unavailable();
    }
    private void lockWedding(){db.queryForMap("SELECT id FROM wedding WHERE id=1 FOR UPDATE");}
    private Settings settings(String surface){
        var row=db.queryForMap("SELECT * FROM gift_settings WHERE surface=? FOR UPDATE",surface);
        return new Settings(Boolean.TRUE.equals(row.get("enabled")),(String)row.get("mode"),(String)row.get("visibility"),
            new Recipient((String)row.get("first_label"),(String)row.get("first_description"),(UUID)row.get("first_asset_id")),
            new Recipient((String)row.get("second_label"),(String)row.get("second_description"),(UUID)row.get("second_asset_id")),AccessGate.number(row,"revision"));
    }
    public Configuration configuration(){owner();lockWedding();return new Configuration(settings("DRAFT"),settings("PUBLISHED"));}
    public Map<String,Long> save(Input input){
        owner();
        ApiErrors.require(input!=null&&input.expectedRevision()>=0,"Cấu hình quà không hợp lệ.");
        ApiErrors.require(Set.of("SINGLE","DUAL").contains(Objects.toString(input.mode(),"")),"Chọn chế độ một hoặc hai mã.");
        ApiErrors.require(Set.of("PRIVATE","PUBLIC").contains(Objects.toString(input.visibility(),"")),"Chọn quyền xem hộp quà.");
        var first=normalize(input.first());var second=normalize(input.second());
        lockWedding();var draft=settings("DRAFT");ApiErrors.version(draft.revision(),input.expectedRevision());
        requireAsset(first.assetId());requireAsset(second.assetId());
        db.update("UPDATE gift_settings SET enabled=?,mode=?,visibility=?,first_label=?,first_description=?,first_asset_id=?,second_label=?,second_description=?,second_asset_id=?,revision=revision+1 WHERE surface='DRAFT'",
            input.enabled(),input.mode(),input.visibility(),first.label(),first.description(),first.assetId(),second.label(),second.description(),second.assetId());
        audit("GIFT_DRAFT");return Map.of("revision",draft.revision()+1);
    }
    private static Recipient normalize(Recipient recipient){
        ApiErrors.require(recipient!=null,"Giữ đủ cấu hình hai vị trí khi lưu, kể cả chế độ một mã.");
        String label=Texts.text(Objects.toString(recipient.label(),"")).strip();
        String description=Texts.text(Objects.toString(recipient.description(),"")).strip();
        ApiErrors.require(label.length()<=80&&description.length()<=240,"Nhãn tối đa 80 ký tự, mô tả tối đa 240 ký tự.");
        return new Recipient(label,description,recipient.assetId());
    }
    private void requireAsset(UUID id){
        if(id!=null)ApiErrors.require(!db.queryForList("SELECT id FROM gift_assets WHERE id=?",id).isEmpty(),"Ảnh QR không tồn tại.");
    }
    public Map<String,Long> publish(Publish input){
        owner();ApiErrors.require(input!=null&&input.expectedRevision()>=0&&input.expectedPublishedRevision()>=0,"Phiên bản không hợp lệ.");
        lockWedding();var draft=settings("DRAFT");var published=settings("PUBLISHED");
        ApiErrors.version(draft.revision(),input.expectedRevision());ApiErrors.version(published.revision(),input.expectedPublishedRevision());
        if(draft.enabled()){
            ApiErrors.require(input.confirmed(),"Chủ thiệp cần tự kiểm tra mã QR và xác nhận người nhận trước khi phát hành.");
            complete(draft.first());if("DUAL".equals(draft.mode()))complete(draft.second());
        }
        db.update("UPDATE gift_settings SET enabled=?,mode=?,visibility=?,first_label=?,first_description=?,first_asset_id=?,second_label=?,second_description=?,second_asset_id=?,revision=revision+1 WHERE surface='PUBLISHED'",
            draft.enabled(),draft.mode(),draft.visibility(),draft.first().label(),draft.first().description(),draft.first().assetId(),draft.second().label(),draft.second().description(),draft.second().assetId());
        audit("GIFT_PUBLISH");return Map.of("revision",published.revision()+1);
    }
    private void complete(Recipient recipient){
        ApiErrors.require(!recipient.label().isBlank()&&recipient.assetId()!=null,"Điền nhãn và ảnh QR cho mỗi người nhận đang hiển thị.");requireAsset(recipient.assetId());
    }
    public UUID upload(MultipartFile file){
        owner();
        ApiErrors.require(file!=null&&!file.isEmpty()&&file.getSize()<=5*1024*1024,"Chọn ảnh PNG tối đa 5 MB.");
        ApiErrors.require("image/png".equals(file.getContentType()),"Ảnh QR phải là PNG, không dùng SVG hoặc ảnh nén JPEG.");
        try{
            byte[] bytes=file.getBytes();
            ApiErrors.require(bytes.length>8&&bytes.length<=5*1024*1024&&Arrays.equals(Arrays.copyOf(bytes,8),new byte[]{(byte)137,80,78,71,13,10,26,10}),"Tệp không phải PNG hợp lệ.");
            try(var stream=ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))){
                var readers=ImageIO.getImageReaders(stream);ApiErrors.require(readers.hasNext(),"Không thể đọc ảnh PNG.");
                var reader=readers.next();
                try{
                    reader.setInput(stream);int width=reader.getWidth(0),height=reader.getHeight(0);
                    ApiErrors.require("png".equalsIgnoreCase(reader.getFormatName())&&width>=220&&height>=220&&width<=4096&&height<=4096&&(long)width*height<=16_777_216,"Ảnh QR cần có mỗi chiều từ 220 đến 4096 pixel.");
                    ApiErrors.require(reader.read(0)!=null,"Không thể đọc ảnh PNG.");
                    UUID id=UUID.randomUUID();
                    db.update("INSERT INTO gift_assets(id,png,width,height) VALUES(?,?,?,?)",id,bytes,width,height);
                    audit("GIFT_UPLOAD");return id;
                }finally{reader.dispose();}
            }
        }catch(IOException e){throw new IllegalArgumentException("Không thể đọc ảnh PNG. Vui lòng chọn lại tệp.");}
    }
    public byte[] ownerAsset(UUID id){owner();return asset(id);}
    public View publicView(String slug){publicGate(slug);return view(settings("PUBLISHED"),false);}
    public View guestView(UUID id,HttpSession session){gate.check(id,session,true);return view(settings("PUBLISHED"),true);}
    public byte[] publicAsset(String slug,UUID assetId){publicGate(slug);return selectedAsset(settings("PUBLISHED"),false,assetId);}
    public byte[] guestAsset(UUID id,HttpSession session,UUID assetId){gate.check(id,session,true);return selectedAsset(settings("PUBLISHED"),true,assetId);}
    private void publicGate(String slug){
        if(db.queryForList("SELECT id FROM wedding WHERE id=1 AND slug=? AND published=true FOR UPDATE",slug).isEmpty())throw ApiErrors.unavailable();
    }
    private View view(Settings settings,boolean guest){
        if(!settings.enabled()||(!guest&&!"PUBLIC".equals(settings.visibility())))return OFF;
        var panels=new ArrayList<Panel>();panels.add(panel(settings.first()));
        if("DUAL".equals(settings.mode()))panels.add(panel(settings.second()));
        return new View(true,settings.mode(),List.copyOf(panels));
    }
    private static Panel panel(Recipient recipient){return new Panel(recipient.label(),recipient.description(),recipient.assetId());}
    private byte[] selectedAsset(Settings settings,boolean guest,UUID id){
        if(view(settings,guest).recipients().stream().noneMatch(panel->Objects.equals(panel.assetId(),id)))throw ApiErrors.unavailable();
        return asset(id);
    }
    private byte[] asset(UUID id){
        var rows=db.queryForList("SELECT png FROM gift_assets WHERE id=?",id);
        if(rows.isEmpty())throw ApiErrors.unavailable();return (byte[])rows.getFirst().get("png");
    }
    private void audit(String action){
        db.update("INSERT INTO audit(action,target,actor) VALUES(?,'gift-settings',?)",action,SecurityContextHolder.getContext().getAuthentication().getName());
    }
}