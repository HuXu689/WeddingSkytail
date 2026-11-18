package vn.wedding.invitation.media;

import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.stream.ImageOutputStream;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.wedding.invitation.common.ApiErrors;

@Service
public class MediaService {
    public static final int MAX_ALBUM_PHOTOS = 200;
    private static final int MAX_FULL_DIMENSION = 2400;
    private static final int MAX_THUMB_DIMENSION = 560;

    private final JdbcTemplate db;
    private final Path root;
    @SuppressWarnings("unused")
    private final String publicOrigin;

    public MediaService(JdbcTemplate db, @Value("${app.media-root:./data/media}") String root, @Value("${app.origin}") String publicOrigin) {
        this.db = db;
        this.root = Paths.get(root).toAbsolutePath().normalize();
        this.publicOrigin = publicOrigin.replaceAll("/$", "");
    }

    @PostConstruct void createRoot() throws IOException { Files.createDirectories(root); }

    public List<Map<String, Object>> list() {
        return db.queryForList(
            "SELECT m.id,m.kind,m.mime_type,m.original_name,m.width,m.height,m.bytes,m.created_at," +
            "coalesce(max(s.focal_x) FILTER (WHERE s.surface='DRAFT'),50) focal_x," +
            "coalesce(max(s.focal_y) FILTER (WHERE s.surface='DRAFT'),50) focal_y," +
            "coalesce(bool_or(s.surface='DRAFT' AND s.slot='HERO'),false) draft_hero," +
            "coalesce(bool_or(s.surface='PUBLISHED' AND s.slot='HERO'),false) published_hero," +
            "coalesce(bool_or(s.surface='DRAFT' AND s.slot='ALBUM'),false) draft_album," +
            "coalesce(bool_or(s.surface='PUBLISHED' AND s.slot='ALBUM'),false) published_album," +
            "coalesce(min(s.sort_order) FILTER (WHERE s.surface='DRAFT' AND s.slot='ALBUM'),-1) draft_album_order," +
            "coalesce(min(s.sort_order) FILTER (WHERE s.surface='PUBLISHED' AND s.slot='ALBUM'),-1) published_album_order," +
            "coalesce((SELECT true FROM wedding w WHERE w.music_id=m.id),false) published_music," +
            "coalesce((SELECT true FROM wedding w WHERE w.draft_music_id=m.id),false) draft_music," +
            "coalesce((SELECT true FROM wedding_sections ws WHERE ws.surface='DRAFT' AND ws.payload IS NOT NULL AND ws.payload::text LIKE '%' || m.id::text || '%' LIMIT 1),false) draft_section," +
            "coalesce((SELECT true FROM wedding_sections ws WHERE ws.surface='PUBLISHED' AND ws.payload IS NOT NULL AND ws.payload::text LIKE '%' || m.id::text || '%' LIMIT 1),false) published_section " +
            "FROM media_assets m LEFT JOIN wedding_media_selection s ON s.media_id=m.id " +
            "GROUP BY m.id ORDER BY m.kind,m.created_at DESC"
        );
    }

    @Transactional
    public UUID upload(MultipartFile upload) {
        ApiErrors.require(upload != null && !upload.isEmpty(), "Vui lòng chọn một ảnh.");
        ApiErrors.require(upload.getSize() <= 100L * 1024 * 1024, "Ảnh không được lớn hơn 100 MB.");
        String name = Optional.ofNullable(upload.getOriginalFilename()).orElse("anh");
        ApiErrors.require(name.length() <= 255, "Tên ảnh quá dài.");
        try (InputStream input = upload.getInputStream()) {
            BufferedImage image = ImageIO.read(input);
            ApiErrors.require(image != null, "Tệp tải lên không phải ảnh hợp lệ hoặc định dạng chưa được hỗ trợ.");
            ApiErrors.require(image.getWidth() <= 12000 && image.getHeight() <= 12000, "Kích thước ảnh vượt giới hạn cho phép.");
            ApiErrors.require((long) image.getWidth() * image.getHeight() <= 80_000_000L, "Ảnh có kích thước điểm ảnh quá lớn.");
            image = boundedImage(image);
            UUID id = UUID.randomUUID();
            String storage = id + ".jpg";
            Path path = resolveSafe(storage);
            writeJpeg(image, path, 0.90f);
            writeJpeg(scaleDown(image, MAX_THUMB_DIMENSION), resolveSafe(thumbName(storage)), 0.82f);
            long bytes = Files.size(path);
            db.update("INSERT INTO media_assets(id,storage_name,original_name,mime_type,width,height,bytes) VALUES(?,?,?,?,?,?,?)",
                id, storage, name, "image/jpeg", image.getWidth(), image.getHeight(), bytes);
            return id;
        } catch (IOException e) {
            throw new IllegalArgumentException("Không thể đọc hoặc lưu ảnh. Vui lòng thử lại.");
        }
    }

    /** Audio upload for background music: no image decoding, magic bytes decide the type, 20 MB ceiling. */
    @Transactional
    public UUID uploadMusic(MultipartFile upload) {
        ApiErrors.require(upload != null && !upload.isEmpty(), "Vui lòng chọn một tệp nhạc.");
        ApiErrors.require(upload.getSize() <= 20L * 1024 * 1024, "Tệp nhạc không được lớn hơn 20 MB.");
        String name = Optional.ofNullable(upload.getOriginalFilename()).orElse("nhac");
        ApiErrors.require(name.length() <= 255, "Tên tệp quá dài.");
        try (InputStream probe = upload.getInputStream()) {
            String mime = audioMime(probe.readNBytes(4096));
            ApiErrors.require(mime != null, "Tệp tải lên không phải nhạc MP3, M4A hoặc OGG hợp lệ.");
            UUID id = UUID.randomUUID();
            String extension = switch (mime) {
                case "audio/mpeg" -> ".mp3";
                case "audio/mp4" -> ".m4a";
                default -> ".ogg";
            };
            Path path = resolveSafe(id + extension);
            try (InputStream input = upload.getInputStream(); OutputStream output = Files.newOutputStream(path, StandardOpenOption.CREATE_NEW)) {
                input.transferTo(output);
            }
            db.update("INSERT INTO media_assets(id,storage_name,original_name,mime_type,width,height,bytes,kind) VALUES(?,?,?,?,NULL,NULL,?,'AUDIO')",
                id, id + extension, name, mime, Files.size(path));
            return id;
        } catch (IOException e) {
            throw new IllegalArgumentException("Không thể đọc hoặc lưu tệp nhạc. Vui lòng thử lại.");
        }
    }

    /** Magic bytes only: nothing here trusts the content type reported by the browser. */
    static String audioMime(byte[] head) {
        if (head.length >= 3 && head[0] == 'I' && head[1] == 'D' && head[2] == '3') return "audio/mpeg";
        if (head.length >= 2 && (head[0] & 0xFF) == 0xFF && (head[1] & 0xE0) == 0xE0) return "audio/mpeg";
        if (head.length >= 12 && new String(head, 4, 4, StandardCharsets.US_ASCII).equals("ftyp")) return "audio/mp4";
        if (head.length >= 4 && head[0] == 'O' && head[1] == 'g' && head[2] == 'g' && head[3] == 'S') return "audio/ogg";
        return null;
    }

    /** Any audio asset; only reachable through an owner-only/editor-only path, used by the library preview. */
    public byte[] asset(UUID id) {
        var rows = db.queryForList("SELECT storage_name FROM media_assets WHERE id=? AND kind='AUDIO'", id);
        if (rows.isEmpty()) throw ApiErrors.unavailable();
        return bytes(resolveSafe((String) rows.getFirst().get("storage_name")));
    }

    public String assetMime(UUID id) {
        var rows = db.queryForList("SELECT mime_type FROM media_assets WHERE id=? AND kind='AUDIO'", id);
        if (rows.isEmpty()) throw ApiErrors.unavailable();
        return (String) rows.getFirst().get("mime_type");
    }

    /** The music guests actually hear, or the draft choice for the owner. */
    public byte[] music(boolean published) {
        String column = published ? "music_id" : "draft_music_id";
        var rows = db.queryForList("SELECT m.storage_name FROM wedding w JOIN media_assets m ON m.id=w." + column + " WHERE w.id=1 AND m.kind='AUDIO'");
        if (rows.isEmpty()) throw ApiErrors.unavailable();
        return bytes(resolveSafe((String) rows.getFirst().get("storage_name")));
    }

    public String musicMime(boolean published) {
        String column = published ? "music_id" : "draft_music_id";
        var rows = db.queryForList("SELECT m.mime_type FROM wedding w JOIN media_assets m ON m.id=w." + column + " WHERE w.id=1 AND m.kind='AUDIO'");
        if (rows.isEmpty()) throw ApiErrors.unavailable();
        return (String) rows.getFirst().get("mime_type");
    }

    private byte[] bytes(Path path) {
        try {
            return Files.readAllBytes(path.normalize());
        } catch (IOException e) {
            throw new IllegalStateException("Không thể đọc tệp media.");
        }
    }

    @Transactional
    public void selectHero(UUID id, String surface) {
        checkSurface(surface);
        existsImage(id);
        var existingFocal = db.queryForList("SELECT focal_x,focal_y FROM wedding_media_selection WHERE media_id=? AND surface=? LIMIT 1", id, surface);
        int fx = existingFocal.isEmpty() ? 50 : ((Number) existingFocal.getFirst().get("focal_x")).intValue();
        int fy = existingFocal.isEmpty() ? 50 : ((Number) existingFocal.getFirst().get("focal_y")).intValue();
        db.update("DELETE FROM wedding_media_selection WHERE surface=? AND slot='HERO'", surface);
        db.update("INSERT INTO wedding_media_selection(media_id,surface,slot,sort_order,focal_x,focal_y) VALUES(?,?,?,0,?,?)", id, surface, "HERO", fx, fy);
    }

    @Transactional
    public void focal(UUID id, String surface, int x, int y) {
        checkSurface(surface);
        existsImage(id);
        ApiErrors.require(x >= 0 && x <= 100 && y >= 0 && y <= 100, "Điểm lấy nét không hợp lệ.");
        int changed = db.update("UPDATE wedding_media_selection SET focal_x=?,focal_y=? WHERE media_id=? AND surface=?", x, y, id, surface);
        ApiErrors.require(changed > 0, "Hãy đặt ảnh này làm ảnh bìa hoặc thêm vào album trước khi chỉnh điểm lấy nét.");
    }

    @Transactional
    public void selectAlbum(List<UUID> ids, String surface) {
        checkSurface(surface);
        ApiErrors.require(ids != null, "Danh sách album không hợp lệ.");
        var unique = new ArrayList<UUID>(ids.size());
        var seen = new HashSet<UUID>();
        for (UUID id : ids) {
            ApiErrors.require(id != null, "Mã ảnh không hợp lệ.");
            if (seen.add(id)) unique.add(id);
        }
        ApiErrors.require(unique.size() <= MAX_ALBUM_PHOTOS, "Album không được quá " + MAX_ALBUM_PHOTOS + " ảnh.");
        var existingFocal = new HashMap<UUID, int[]>();
        for (var row : db.queryForList("SELECT media_id,focal_x,focal_y FROM wedding_media_selection WHERE surface=?", surface)) {
            existingFocal.put((UUID) row.get("media_id"), new int[]{((Number) row.get("focal_x")).intValue(), ((Number) row.get("focal_y")).intValue()});
        }
        db.update("DELETE FROM wedding_media_selection WHERE surface=? AND slot='ALBUM'", surface);
        for (int i = 0; i < unique.size(); i++) {
            UUID id = unique.get(i);
            existsImage(id);
            int[] focal = existingFocal.getOrDefault(id, new int[]{50, 50});
            db.update("INSERT INTO wedding_media_selection(media_id,surface,slot,sort_order,focal_x,focal_y) VALUES(?,?,?,?,?,?)", id, surface, "ALBUM", i, focal[0], focal[1]);
        }
    }

    @Transactional
    public void remove(UUID id) {
        int refs = Objects.requireNonNullElse(db.queryForObject("SELECT count(*) FROM wedding_media_selection WHERE media_id=?", Integer.class, id), 0);
        int music = Objects.requireNonNullElse(db.queryForObject("SELECT count(*) FROM wedding WHERE music_id=? OR draft_music_id=?", Integer.class, id, id), 0);
        int sectionRefs = Objects.requireNonNullElse(db.queryForObject("SELECT count(*) FROM wedding_sections WHERE payload IS NOT NULL AND payload::text LIKE ?", Integer.class, "%" + id + "%"), 0);
        ApiErrors.require(refs == 0 && music == 0 && sectionRefs == 0, "Tệp đang được dùng trong bản nháp hoặc bản đã phát hành.");
        String storage = db.queryForObject("SELECT storage_name FROM media_assets WHERE id=?", String.class, id);
        db.update("DELETE FROM media_assets WHERE id=?", id);
        try {
            if (storage != null) {
                Files.deleteIfExists(resolveSafe(storage));
                Files.deleteIfExists(resolveSafe(thumbName(storage)));
            }
        } catch (IOException e) {
            throw new IllegalStateException("Không thể xóa tệp.");
        }
    }

    /** Admin preview/library can view any uploaded IMAGE asset, even before placing it in hero/album. */
    public byte[] readAdmin(UUID id) {
        var rows = db.queryForList("SELECT storage_name FROM media_assets WHERE id=? AND kind='IMAGE'", id);
        if (rows.isEmpty()) throw ApiErrors.unavailable();
        return bytes(resolveSafe((String) rows.getFirst().get("storage_name")));
    }

    public byte[] readAdminThumb(UUID id) {
        var rows = db.queryForList("SELECT storage_name FROM media_assets WHERE id=? AND kind='IMAGE'", id);
        if (rows.isEmpty()) throw ApiErrors.unavailable();
        return thumbBytes((String) rows.getFirst().get("storage_name"));
    }

    private List<Map<String, Object>> findPublishedStorage(UUID id) {
        String sql = "SELECT m.storage_name FROM media_assets m JOIN wedding_media_selection s ON s.media_id=m.id WHERE m.id=? AND s.surface='PUBLISHED' AND m.kind='IMAGE'";
        var rows = db.queryForList(sql, id);
        if (!rows.isEmpty()) return rows;
        String sectionSql = "SELECT m.storage_name FROM media_assets m WHERE m.id=? AND m.kind='IMAGE' AND EXISTS (SELECT 1 FROM wedding_sections ws WHERE ws.surface='PUBLISHED' AND ws.enabled=true AND ws.payload IS NOT NULL AND ws.payload::text LIKE ?)";
        return db.queryForList(sectionSql, id, "%" + id + "%");
    }

    public byte[] read(UUID id, boolean published) {
        if (!published) return readAdmin(id);
        var rows = findPublishedStorage(id);
        if (rows.isEmpty()) throw ApiErrors.unavailable();
        return bytes(resolveSafe((String) rows.getFirst().get("storage_name")));
    }

    public byte[] readApproved(UUID id) { return read(id, true); }

    public byte[] readApprovedThumb(UUID id) {
        var rows = findPublishedStorage(id);
        if (rows.isEmpty()) throw ApiErrors.unavailable();
        return thumbBytes((String) rows.getFirst().get("storage_name"));
    }

    private byte[] thumbBytes(String storageName) {
        Path thumb = resolveSafe(thumbName(storageName));
        if (Files.exists(thumb)) return bytes(thumb);
        Path full = resolveSafe(storageName);
        if (!Files.exists(full)) throw new IllegalStateException("Không thể đọc ảnh.");
        try {
            BufferedImage source = ImageIO.read(full.toFile());
            if (source == null) return bytes(full);
            BufferedImage scaled = scaleDown(source, MAX_THUMB_DIMENSION);
            Path temp = Files.createTempFile(root, "thumb-", ".tmp");
            try {
                writeJpeg(scaled, temp, 0.82f);
                Files.move(temp, thumb, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException ignored) {
                Files.deleteIfExists(temp);
                return bytes(full);
            }
            return bytes(thumb);
        } catch (IOException e) {
            return bytes(full);
        }
    }

    public Map<String, Object> published() { return selected("PUBLISHED"); }
    public Map<String, Object> draft() { return selected("DRAFT"); }

    /** Root-relative URLs work identically across localhost, IP, HTTPS, and reverse proxies without cross-origin cookie drops. */
    private Map<String, Object> selected(String surface) {
        var result = new HashMap<String, Object>();
        var hero = db.queryForList("SELECT m.id,s.focal_x,s.focal_y FROM media_assets m JOIN wedding_media_selection s ON s.media_id=m.id WHERE s.surface=? AND s.slot='HERO'", surface);
        var album = db.queryForList("SELECT m.id FROM media_assets m JOIN wedding_media_selection s ON s.media_id=m.id WHERE s.surface=? AND s.slot='ALBUM' ORDER BY s.sort_order", surface);
        String prefix = "DRAFT".equals(surface) ? "/api/v1/admin/media/" : "/media/";
        String suffix = "DRAFT".equals(surface) ? "/content" : ".jpg";
        result.put("heroUrl", hero.isEmpty() ? null : prefix + hero.getFirst().get("id") + suffix);
        result.put("heroPosition", hero.isEmpty() ? null : hero.getFirst().get("focal_x") + "% " + hero.getFirst().get("focal_y") + "%");
        result.put("albumUrls", album.stream().map(row -> prefix + row.get("id") + suffix).toList());
        result.put("musicUrl", musicUrl(surface));
        return result;
    }

    /** The guest-facing URL is stable: `/api/v1/media/audio` always resolves whatever track is live now. */
    private String musicUrl(String surface) {
        boolean draft = "DRAFT".equals(surface);
        var rows = db.queryForList("SELECT " + (draft ? "draft_music_id" : "music_id") + " FROM wedding WHERE id=1");
        if (rows.isEmpty() || rows.getFirst().get(draft ? "draft_music_id" : "music_id") == null) return null;
        return draft ? "/api/v1/admin/media/audio" : "/api/v1/media/audio";
    }

    public void publishSelection() {
        db.update("DELETE FROM wedding_media_selection WHERE surface='PUBLISHED'");
        db.update("INSERT INTO wedding_media_selection(media_id,surface,slot,sort_order,focal_x,focal_y) SELECT media_id,'PUBLISHED',slot,sort_order,focal_x,focal_y FROM wedding_media_selection WHERE surface='DRAFT'");
    }

    private void existsImage(UUID id) {
        ApiErrors.require(id != null && db.query("SELECT id FROM media_assets WHERE id=? AND kind='IMAGE'", (rs, n) -> rs.getObject(1), id).size() == 1, "Ảnh không tồn tại.");
    }

    private Path resolveSafe(String filename) {
        Path resolved = root.resolve(filename).normalize();
        ApiErrors.require(resolved.getParent().equals(root), "Đường dẫn tệp không hợp lệ.");
        return resolved;
    }

    private static String thumbName(String storageName) {
        return storageName.endsWith(".jpg") ? storageName.substring(0, storageName.length() - 4) + "_thumb.jpg" : storageName + "_thumb.jpg";
    }

    /** Bound decoded uploads before JPEG storage; flatten transparent PNG on white. */
    public static BufferedImage boundedImage(BufferedImage source) {
        return scaleDown(source, MAX_FULL_DIMENSION);
    }

    private static BufferedImage scaleDown(BufferedImage source, int maxDimension) {
        double scale = Math.min(1d, (double) maxDimension / Math.max(source.getWidth(), source.getHeight()));
        int width = Math.max(1, (int) Math.round(source.getWidth() * scale));
        int height = Math.max(1, (int) Math.round(source.getHeight() * scale));
        var output = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        var graphics = output.createGraphics();
        try {
            graphics.setColor(java.awt.Color.WHITE);
            graphics.fillRect(0, 0, width, height);
            graphics.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION, java.awt.RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.drawImage(source, 0, 0, width, height, null);
        } finally {
            graphics.dispose();
        }
        return output;
    }

    private static void writeJpeg(BufferedImage image, Path path, float quality) throws IOException {
        var writers = ImageIO.getImageWritersByFormatName("jpeg");
        if (!writers.hasNext()) {
            ApiErrors.require(ImageIO.write(image, "JPEG", path.toFile()), "Máy chủ không thể xử lý ảnh.");
            return;
        }
        var writer = writers.next();
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(path.toFile())) {
            ApiErrors.require(ios != null, "Máy chủ không thể xử lý ảnh.");
            writer.setOutput(ios);
            var param = writer.getDefaultWriteParam();
            if (param.canWriteCompressed()) {
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(quality);
            }
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
    }

    public void requireAudio(UUID id) {
        ApiErrors.require(id != null && db.query("SELECT id FROM media_assets WHERE id=? AND kind='AUDIO'", (rs, n) -> rs.getObject(1), id).size() == 1, "Tệp nhạc không tồn tại.");
    }

    private static void checkSurface(String surface) {
        ApiErrors.require("DRAFT".equals(surface) || "PUBLISHED".equals(surface), "Bề mặt ảnh không hợp lệ.");
    }
}
