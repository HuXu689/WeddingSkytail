package vn.wedding.invitation.media;

import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.charset.StandardCharsets;
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
    public List<Map<String,Object>> list() { return db.queryForList("SELECT m.id,m.kind,m.mime_type,m.original_name,m.width,m.height,m.bytes,m.created_at,coalesce(max(s.focal_x) FILTER (WHERE s.surface='DRAFT'),50) focal_x,coalesce(max(s.focal_y) FILTER (WHERE s.surface='DRAFT'),50) focal_y,coalesce(bool_or(s.surface='DRAFT' AND s.slot='HERO'),false) draft_hero,coalesce(bool_or(s.surface='PUBLISHED' AND s.slot='HERO'),false) published_hero,coalesce(bool_or(s.surface='DRAFT' AND s.slot='ALBUM'),false) draft_album,coalesce(bool_or(s.surface='PUBLISHED' AND s.slot='ALBUM'),false) published_album,coalesce((SELECT true FROM wedding w WHERE w.music_id=m.id),false) published_music,coalesce((SELECT true FROM wedding w WHERE w.draft_music_id=m.id),false) draft_music FROM media_assets m LEFT JOIN wedding_media_selection s ON s.media_id=m.id GROUP BY m.id ORDER BY m.kind,m.created_at DESC"); }
    @Transactional
    public UUID upload(MultipartFile upload) {
        ApiErrors.require(upload!=null && !upload.isEmpty(),"Vui lòng chọn một ảnh.");
        ApiErrors.require(upload.getSize()<=100*1024*1024,"Ảnh không được lớn hơn 100 MB.");
        String name=Optional.ofNullable(upload.getOriginalFilename()).orElse("anh");
        ApiErrors.require(name.length()<=255,"Tên ảnh quá dài.");
        try(InputStream input=upload.getInputStream()) {
            BufferedImage image=ImageIO.read(input);
            ApiErrors.require(image!=null,"Tệp tải lên không phải ảnh hợp lệ hoặc định dạng chưa được hỗ trợ.");
            ApiErrors.require(image.getWidth()<=12000&&image.getHeight()<=12000,"Kích thước ảnh vượt giới hạn cho phép.");
            ApiErrors.require((long)image.getWidth()*image.getHeight()<=80_000_000L,"Ảnh có kích thước điểm ảnh quá lớn.");
            image=boundedImage(image);
            UUID id=UUID.randomUUID();String storage=id+".jpg";Path path=root.resolve(storage).normalize();
            ApiErrors.require(path.getParent().equals(root),"Đường dẫn tệp không hợp lệ.");
            ApiErrors.require(ImageIO.write(image,"JPEG",path.toFile()),"Máy chủ không thể xử lý ảnh.");
            long bytes=Files.size(path);db.update("INSERT INTO media_assets(id,storage_name,original_name,mime_type,width,height,bytes) VALUES(?,?,?,?,?,?,?)",id,storage,name,"image/jpeg",image.getWidth(),image.getHeight(),bytes);
            return id;
        } catch(IOException e){throw new IllegalArgumentException("Không thể đọc hoặc lưu ảnh. Vui lòng thử lại.");}
    }
    /** Audio upload for background music: no image decoding, magic bytes decide the type, 20 MB ceiling. */
    @Transactional
    public UUID uploadMusic(MultipartFile upload) {
        ApiErrors.require(upload!=null && !upload.isEmpty(),"Vui lòng chọn một tệp nhạc.");
        ApiErrors.require(upload.getSize()<=20*1024*1024,"Tệp nhạc không được lớn hơn 20 MB.");
        String name=Optional.ofNullable(upload.getOriginalFilename()).orElse("nhac");
        ApiErrors.require(name.length()<=255,"Tên tệp quá dài.");
        try(InputStream probe=upload.getInputStream()) {
            String mime=audioMime(probe.readNBytes(4096));
            ApiErrors.require(mime!=null,"Tệp tải lên không phải nhạc MP3, M4A hoặc OGG hợp lệ.");
            UUID id=UUID.randomUUID(); String extension=switch(mime){case "audio/mpeg"->".mp3";case "audio/mp4"->".m4a";default->".ogg";};
            Path path=root.resolve(id+extension).normalize();
            ApiErrors.require(path.getParent().equals(root),"Đường dẫn tệp không hợp lệ.");
            try(InputStream input=upload.getInputStream(); OutputStream output=Files.newOutputStream(path,StandardOpenOption.CREATE_NEW)) { input.transferTo(output); }
            db.update("INSERT INTO media_assets(id,storage_name,original_name,mime_type,width,height,bytes,kind) VALUES(?,?,?,?,NULL,NULL,?,'AUDIO')",id,id+extension,name,mime,Files.size(path));
            return id;
        } catch(IOException e){throw new IllegalArgumentException("Không thể đọc hoặc lưu tệp nhạc. Vui lòng thử lại.");}
    }
    /** Magic bytes only: nothing here trusts the content type reported by the browser. */
    static String audioMime(byte[] head) {
        if(head.length>=3 && head[0]=='I' && head[1]=='D' && head[2]=='3') return "audio/mpeg";
        if(head.length>=2 && (head[0]&0xFF)==0xFF && (head[1]&0xE0)==0xE0) return "audio/mpeg";
        if(head.length>=12 && new String(head,4,4,StandardCharsets.US_ASCII).equals("ftyp")) return "audio/mp4";
        if(head.length>=4 && head[0]=='O' && head[1]=='g' && head[2]=='g' && head[3]=='S') return "audio/ogg";
        return null;
    }
    /** Any audio asset; only reachable through an owner-only path, used by the library preview. */
    public byte[] asset(UUID id){ var rows=db.queryForList("SELECT storage_name FROM media_assets WHERE id=? AND kind='AUDIO'",id); if(rows.isEmpty()) throw ApiErrors.unavailable(); return bytes(root.resolve((String)rows.getFirst().get("storage_name"))); }
    public String assetMime(UUID id){ var rows=db.queryForList("SELECT mime_type FROM media_assets WHERE id=? AND kind='AUDIO'",id); if(rows.isEmpty()) throw ApiErrors.unavailable(); return (String)rows.getFirst().get("mime_type"); }
    /** The music guests actually hear, or the draft choice for the owner. */
    public byte[] music(boolean published){ String column=published?"music_id":"draft_music_id"; var rows=db.queryForList("SELECT m.storage_name FROM wedding w JOIN media_assets m ON m.id=w."+column+" WHERE w.id=1 AND m.kind='AUDIO'"); if(rows.isEmpty()) throw ApiErrors.unavailable(); return bytes(root.resolve((String)rows.getFirst().get("storage_name"))); }
    public String musicMime(boolean published){ String column=published?"music_id":"draft_music_id"; var rows=db.queryForList("SELECT m.mime_type FROM wedding w JOIN media_assets m ON m.id=w."+column+" WHERE w.id=1 AND m.kind='AUDIO'"); if(rows.isEmpty()) throw ApiErrors.unavailable(); return (String)rows.getFirst().get("mime_type"); }
    private byte[] bytes(Path path){ try{return Files.readAllBytes(path.normalize());}catch(IOException e){throw new IllegalStateException("Không thể đọc tệp media.");} }
    @Transactional
    public void selectHero(UUID id,String surface) { checkSurface(surface); exists(id);db.update("DELETE FROM wedding_media_selection WHERE surface=? AND slot='HERO'",surface);db.update("INSERT INTO wedding_media_selection(media_id,surface,slot,sort_order) VALUES(?,?,?,0)",id,surface,"HERO"); }
    @Transactional
    public void focal(UUID id,String surface,int x,int y) { checkSurface(surface); exists(id); ApiErrors.require(x>=0&&x<=100&&y>=0&&y<=100,"Điểm lấy nét không hợp lệ."); int changed=db.update("UPDATE wedding_media_selection SET focal_x=?,focal_y=? WHERE media_id=? AND surface=?",x,y,id,surface); ApiErrors.require(changed>0,"Ảnh chưa được chọn cho bề mặt này."); }
    @Transactional
    public void selectAlbum(List<UUID> ids,String surface) { checkSurface(surface);ApiErrors.require(ids!=null&&ids.size()<=30,"Album không được quá 30 ảnh.");db.update("DELETE FROM wedding_media_selection WHERE surface=? AND slot='ALBUM'",surface);for(int i=0;i<ids.size();i++){exists(ids.get(i));db.update("INSERT INTO wedding_media_selection(media_id,surface,slot,sort_order) VALUES(?,?,?,?)",ids.get(i),surface,"ALBUM",i);}}
    @Transactional public void remove(UUID id) { var refs=db.queryForObject("SELECT count(*) FROM wedding_media_selection WHERE media_id=?",Integer.class,id);var music=db.queryForObject("SELECT count(*) FROM wedding WHERE music_id=? OR draft_music_id=?",Integer.class,id,id);ApiErrors.require(refs==0&&music==0,"Tệp đang được dùng trong bản nháp hoặc bản đã phát hành.");String storage=db.queryForObject("SELECT storage_name FROM media_assets WHERE id=?",String.class,id);db.update("DELETE FROM media_assets WHERE id=?",id);try{Files.deleteIfExists(root.resolve(storage).normalize());}catch(IOException e){throw new IllegalStateException("Không thể xóa tệp.");}}
    public byte[] read(UUID id,boolean published) { String sql="SELECT m.storage_name FROM media_assets m JOIN wedding_media_selection s ON s.media_id=m.id WHERE m.id=? AND s.surface=?";var rows=db.queryForList(sql,id,published?"PUBLISHED":"DRAFT");if(rows.isEmpty())throw ApiErrors.unavailable();try{return Files.readAllBytes(root.resolve((String)rows.getFirst().get("storage_name")).normalize());}catch(IOException e){throw new IllegalStateException("Không thể đọc ảnh.");}}
    public byte[] readApproved(UUID id) { return read(id,true); }
    public Map<String,Object> published() {return selected("PUBLISHED");}
    public Map<String,Object> draft() {return selected("DRAFT");}
    private Map<String,Object> selected(String surface) {var result=new HashMap<String,Object>();var hero=db.queryForList("SELECT m.id,s.focal_x,s.focal_y FROM media_assets m JOIN wedding_media_selection s ON s.media_id=m.id WHERE s.surface=? AND s.slot='HERO'",surface);var album=db.queryForList("SELECT m.id FROM media_assets m JOIN wedding_media_selection s ON s.media_id=m.id WHERE s.surface=? AND s.slot='ALBUM' ORDER BY s.sort_order",surface);String prefix="DRAFT".equals(surface)?publicOrigin+"/api/v1/admin/media/":publicOrigin+"/media/";String suffix="DRAFT".equals(surface)?"/content":".jpg";result.put("heroUrl",hero.isEmpty()?null:prefix+hero.getFirst().get("id")+suffix);result.put("heroPosition",hero.isEmpty()?null:hero.getFirst().get("focal_x")+"% "+hero.getFirst().get("focal_y")+"%");result.put("albumUrls",album.stream().map(row->prefix+row.get("id")+suffix).toList());result.put("musicUrl",musicUrl(surface));return result;}
    /** The guest-facing URL is stable: `/media/audio` always resolves whatever track is live now. */
    private String musicUrl(String surface){ boolean draft="DRAFT".equals(surface); var rows=db.queryForList("SELECT "+(draft?"draft_music_id":"music_id")+" FROM wedding WHERE id=1"); if(rows.isEmpty()||rows.getFirst().get(draft?"draft_music_id":"music_id")==null) return null; return draft?publicOrigin+"/api/v1/admin/media/audio":publicOrigin+"/api/v1/media/audio"; }
    public void publishSelection(){db.update("DELETE FROM wedding_media_selection WHERE surface='PUBLISHED'");db.update("INSERT INTO wedding_media_selection(media_id,surface,slot,sort_order,focal_x,focal_y) SELECT media_id,'PUBLISHED',slot,sort_order,focal_x,focal_y FROM wedding_media_selection WHERE surface='DRAFT'");}
    private void exists(UUID id){ApiErrors.require(id!=null&&db.query("SELECT id FROM media_assets WHERE id=?",(rs,n)->rs.getObject(1),id).size()==1,"Ảnh không tồn tại.");}
    /** Bound decoded uploads before JPEG storage; flatten transparent PNG on white. */
    public static BufferedImage boundedImage(BufferedImage source){
        double scale=Math.min(1d,2400d/Math.max(source.getWidth(),source.getHeight()));
        int width=Math.max(1,(int)Math.round(source.getWidth()*scale)),height=Math.max(1,(int)Math.round(source.getHeight()*scale));
        var output=new BufferedImage(width,height,BufferedImage.TYPE_INT_RGB);
        var graphics=output.createGraphics();
        try{graphics.setColor(java.awt.Color.WHITE);graphics.fillRect(0,0,width,height);graphics.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION,java.awt.RenderingHints.VALUE_INTERPOLATION_BICUBIC);graphics.drawImage(source,0,0,width,height,null);}finally{graphics.dispose();}
        return output;
    }
    public void requireAudio(UUID id){ApiErrors.require(id!=null&&db.query("SELECT id FROM media_assets WHERE id=? AND kind='AUDIO'",(rs,n)->rs.getObject(1),id).size()==1,"Tệp nhạc không tồn tại.");}
    private static void checkSurface(String surface){ApiErrors.require("DRAFT".equals(surface)||"PUBLISHED".equals(surface),"Bề mặt ảnh không hợp lệ.");}
}