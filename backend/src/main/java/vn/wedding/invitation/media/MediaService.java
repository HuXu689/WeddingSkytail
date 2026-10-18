package vn.wedding.invitation.media;

import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.sql.Timestamp;
import java.util.*;
import javax.imageio.ImageIO;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.wedding.invitation.common.ApiErrors;

@Service
public class MediaService {
    private final JdbcTemplate db;
    private final Path root;
    private final String publicOrigin;
    public MediaService(JdbcTemplate db,@Value("${app.media-root:./data/media}") String root,@Value("${app.origin}") String publicOrigin) { this.db=db;this.root=Paths.get(root).toAbsolutePath().normalize();this.publicOrigin=publicOrigin.replaceAll("/$",""); }
    @PostConstruct void createRoot() throws IOException { Files.createDirectories(root); }
    public List<Map<String,Object>> list() { return db.queryForList("SELECT m.id,m.original_name,m.width,m.height,m.bytes,m.created_at,coalesce(bool_or(s.surface='DRAFT' AND s.slot='HERO'),false) draft_hero,coalesce(bool_or(s.surface='PUBLISHED' AND s.slot='HERO'),false) published_hero,coalesce(bool_or(s.surface='DRAFT' AND s.slot='ALBUM'),false) draft_album,coalesce(bool_or(s.surface='PUBLISHED' AND s.slot='ALBUM'),false) published_album FROM media_assets m LEFT JOIN wedding_media_selection s ON s.media_id=m.id GROUP BY m.id ORDER BY m.created_at DESC"); }
    @Transactional
    public UUID upload(MultipartFile upload) {
        ApiErrors.require(upload!=null && !upload.isEmpty(),"Vui lòng chọn một ảnh.");
        ApiErrors.require(upload.getSize()<=10*1024*1024,"Ảnh không được lớn hơn 10 MB.");
        String name=Optional.ofNullable(upload.getOriginalFilename()).orElse("anh");
        ApiErrors.require(name.length()<=255,"Tên ảnh quá dài.");
        try(InputStream input=upload.getInputStream()) {
            BufferedImage image=ImageIO.read(input);
            ApiErrors.require(image!=null,"Tệp tải lên không phải ảnh hợp lệ hoặc định dạng chưa được hỗ trợ.");
            ApiErrors.require(image.getWidth()<=12000&&image.getHeight()<=12000,"Kích thước ảnh vượt giới hạn cho phép.");
            ApiErrors.require((long)image.getWidth()*image.getHeight()<=80_000_000L,"Ảnh có kích thước điểm ảnh quá lớn.");
            UUID id=UUID.randomUUID();String storage=id+".jpg";Path path=root.resolve(storage).normalize();
            ApiErrors.require(path.getParent().equals(root),"Đường dẫn tệp không hợp lệ.");
            ApiErrors.require(ImageIO.write(image,"JPEG",path.toFile()),"Máy chủ không thể xử lý ảnh.");
            long bytes=Files.size(path);db.update("INSERT INTO media_assets(id,storage_name,original_name,mime_type,width,height,bytes) VALUES(?,?,?,?,?,?,?)",id,storage,name,"image/jpeg",image.getWidth(),image.getHeight(),bytes);
            return id;
        } catch(IOException e){throw new IllegalArgumentException("Không thể đọc hoặc lưu ảnh. Vui lòng thử lại.");}
    }
    @Transactional
    public void selectHero(UUID id,String surface) { checkSurface(surface); exists(id);db.update("DELETE FROM wedding_media_selection WHERE surface=? AND slot='HERO'",surface);db.update("INSERT INTO wedding_media_selection(media_id,surface,slot,sort_order) VALUES(?,?,?,0)",id,surface,"HERO"); }
    @Transactional
    public void selectAlbum(List<UUID> ids,String surface) { checkSurface(surface);ApiErrors.require(ids!=null&&ids.size()<=30,"Album không được quá 30 ảnh.");db.update("DELETE FROM wedding_media_selection WHERE surface=? AND slot='ALBUM'",surface);for(int i=0;i<ids.size();i++){exists(ids.get(i));db.update("INSERT INTO wedding_media_selection(media_id,surface,slot,sort_order) VALUES(?,?,?,?)",ids.get(i),surface,"ALBUM",i);}}
    @Transactional public void remove(UUID id) { var refs=db.queryForObject("SELECT count(*) FROM wedding_media_selection WHERE media_id=?",Integer.class,id);ApiErrors.require(refs==0,"Ảnh đang được dùng trong bản nháp hoặc bản đã phát hành.");db.queryForObject("SELECT id FROM media_assets WHERE id=?",UUID.class,id);db.update("DELETE FROM media_assets WHERE id=?",id);try{Files.deleteIfExists(root.resolve(id+".jpg"));}catch(IOException e){throw new IllegalStateException("Không thể xóa tệp ảnh.");}}
    public byte[] read(UUID id,boolean published) { String sql="SELECT m.storage_name FROM media_assets m JOIN wedding_media_selection s ON s.media_id=m.id WHERE m.id=? AND s.surface=?";var rows=db.queryForList(sql,id,published?"PUBLISHED":"DRAFT");if(rows.isEmpty())throw ApiErrors.unavailable();try{return Files.readAllBytes(root.resolve((String)rows.getFirst().get("storage_name")).normalize());}catch(IOException e){throw new IllegalStateException("Không thể đọc ảnh.");}}
    public byte[] readApproved(UUID id) { return read(id,true); }
    public Map<String,Object> published() {return selected("PUBLISHED");}
    public Map<String,Object> draft() {return selected("DRAFT");}
    private Map<String,Object> selected(String surface) {var result=new HashMap<String,Object>();var hero=db.queryForList("SELECT m.id FROM media_assets m JOIN wedding_media_selection s ON s.media_id=m.id WHERE s.surface=? AND s.slot='HERO'",surface);var album=db.queryForList("SELECT m.id FROM media_assets m JOIN wedding_media_selection s ON s.media_id=m.id WHERE s.surface=? AND s.slot='ALBUM' ORDER BY s.sort_order",surface);String prefix="DRAFT".equals(surface)?publicOrigin+"/api/v1/admin/media/":publicOrigin+"/media/";String suffix="DRAFT".equals(surface)?"/content":".jpg";result.put("heroUrl",hero.isEmpty()?null:prefix+hero.getFirst().get("id")+suffix);result.put("albumUrls",album.stream().map(row->prefix+row.get("id")+suffix).toList());return result;}
    public void publishSelection(){db.update("DELETE FROM wedding_media_selection WHERE surface='PUBLISHED'");db.update("INSERT INTO wedding_media_selection(media_id,surface,slot,sort_order) SELECT media_id,'PUBLISHED',slot,sort_order FROM wedding_media_selection WHERE surface='DRAFT'");}
    private void exists(UUID id){ApiErrors.require(id!=null&&db.query("SELECT id FROM media_assets WHERE id=?",(rs,n)->rs.getObject(1),id).size()==1,"Ảnh không tồn tại.");}
    private static void checkSurface(String surface){ApiErrors.require("DRAFT".equals(surface)||"PUBLISHED".equals(surface),"Bề mặt ảnh không hợp lệ.");}
}