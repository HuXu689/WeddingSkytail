package vn.wedding.invitation;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import vn.wedding.invitation.media.MediaService;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MediaAlbumAndReadTest {
    @TempDir Path root;

    @SuppressWarnings("unchecked")
    @Test void albumSupports120UniquePhotosAndRejectsAbove200() {
        var db=mock(JdbcTemplate.class);
        when(db.queryForList(startsWith("SELECT media_id,focal_x,focal_y"),eq("DRAFT"))).thenReturn(List.of());
        when(db.query(eq("SELECT id FROM media_assets WHERE id=? AND kind='IMAGE'"),any(RowMapper.class),any()))
            .thenAnswer(inv->List.of((UUID)inv.getArgument(2)));
        var service=new MediaService(db,root.toString(),"http://localhost:8088");
        var ids=new ArrayList<UUID>();
        for(int i=0;i<120;i++) ids.add(UUID.randomUUID());
        ids.add(ids.get(0)); // duplicate should be deduplicated cleanly
        assertDoesNotThrow(()->service.selectAlbum(ids,"DRAFT"));
        verify(db,times(120)).update(startsWith("INSERT INTO wedding_media_selection"),any(),eq("DRAFT"),eq("ALBUM"),anyInt(),eq(50),eq(50));

        var tooMany=new ArrayList<UUID>();
        for(int i=0;i<=MediaService.MAX_ALBUM_PHOTOS;i++) tooMany.add(UUID.randomUUID());
        assertThrows(ResponseStatusException.class,()->service.selectAlbum(tooMany,"DRAFT"));
    }

    @Test void readAdminReadsUnselectedImageWhilePublishedRequiresSelection() throws Exception {
        var db=mock(JdbcTemplate.class);
        UUID id=UUID.randomUUID();
        Files.write(root.resolve(id+".jpg"),new byte[]{1,2,3});
        when(db.queryForList("SELECT storage_name FROM media_assets WHERE id=? AND kind='IMAGE'",id))
            .thenReturn(List.of(Map.of("storage_name",id+".jpg")));
        when(db.queryForList(contains("s.surface='PUBLISHED'"),eq(id))).thenReturn(List.of());
        var service=new MediaService(db,root.toString(),"http://localhost:8088");
        assertArrayEquals(new byte[]{1,2,3},service.readAdmin(id));
        assertThrows(ResponseStatusException.class,()->service.readApproved(id));
    }

    @Test void draftAndPublishedReturnRootRelativeUrls() {
        var db=mock(JdbcTemplate.class);
        UUID hero=UUID.randomUUID(),album=UUID.randomUUID();
        when(db.queryForList(contains("s.slot='HERO'"),eq("DRAFT"))).thenReturn(List.of(Map.of("id",hero,"focal_x",40,"focal_y",60)));
        when(db.queryForList(contains("s.slot='ALBUM'"),eq("DRAFT"))).thenReturn(List.of(Map.of("id",album)));
        when(db.queryForList(contains("SELECT draft_music_id FROM wedding"))).thenReturn(List.of(Map.of("draft_music_id",UUID.randomUUID())));
        when(db.queryForList(contains("s.slot='HERO'"),eq("PUBLISHED"))).thenReturn(List.of(Map.of("id",hero,"focal_x",50,"focal_y",50)));
        when(db.queryForList(contains("s.slot='ALBUM'"),eq("PUBLISHED"))).thenReturn(List.of(Map.of("id",album)));
        when(db.queryForList(contains("SELECT music_id FROM wedding"))).thenReturn(List.of(Map.of("music_id",UUID.randomUUID())));
        var service=new MediaService(db,root.toString(),"http://localhost:8088");
        var draft=service.draft();
        assertEquals("/api/v1/admin/media/"+hero+"/content",draft.get("heroUrl"));
        assertEquals(List.of("/api/v1/admin/media/"+album+"/content"),draft.get("albumUrls"));
        assertEquals("/api/v1/admin/media/audio",draft.get("musicUrl"));
        var pub=service.published();
        assertEquals("/media/"+hero+".jpg",pub.get("heroUrl"));
        assertEquals(List.of("/media/"+album+".jpg"),pub.get("albumUrls"));
        assertEquals("/api/v1/media/audio",pub.get("musicUrl"));
    }

    @Test void uploadWritesThumbnailAndRemoveDeletesBoth() throws Exception {
        var db=mock(JdbcTemplate.class);
        var content=new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(1200,800,BufferedImage.TYPE_INT_RGB),"PNG",content);
        var file=mock(MultipartFile.class);
        when(file.getSize()).thenReturn((long)content.size());
        when(file.getOriginalFilename()).thenReturn("photo.png");
        when(file.getInputStream()).thenAnswer(inv->new ByteArrayInputStream(content.toByteArray()));
        var service=new MediaService(db,root.toString(),"http://localhost");
        UUID id=service.upload(file);
        assertTrue(Files.exists(root.resolve(id+".jpg")));
        assertTrue(Files.exists(root.resolve(id+"_thumb.jpg")));
        BufferedImage thumb=ImageIO.read(root.resolve(id+"_thumb.jpg").toFile());
        assertEquals(560,thumb.getWidth());

        when(db.queryForObject("SELECT count(*) FROM wedding_media_selection WHERE media_id=?",Integer.class,id)).thenReturn(0);
        when(db.queryForObject("SELECT count(*) FROM wedding WHERE music_id=? OR draft_music_id=?",Integer.class,id,id)).thenReturn(0);
        when(db.queryForObject("SELECT storage_name FROM media_assets WHERE id=?",String.class,id)).thenReturn(id+".jpg");
        service.remove(id);
        assertFalse(Files.exists(root.resolve(id+".jpg")));
        assertFalse(Files.exists(root.resolve(id+"_thumb.jpg")));
    }
}
