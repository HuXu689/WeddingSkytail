package vn.wedding.invitation;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import vn.wedding.invitation.media.MediaService;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MediaDeletionTest {
 @TempDir Path root;
 @Test void unusedAudioDeletesRecordAndFile() throws Exception {
  var db=mock(JdbcTemplate.class);var id=UUID.randomUUID();
  when(db.queryForObject("SELECT count(*) FROM wedding_media_selection WHERE media_id=?",Integer.class,id)).thenReturn(0);
  when(db.queryForObject("SELECT count(*) FROM wedding WHERE music_id=? OR draft_music_id=?",Integer.class,id,id)).thenReturn(0);
  when(db.queryForObject("SELECT storage_name FROM media_assets WHERE id=?",String.class,id)).thenReturn("test.mp3");
  Files.write(root.resolve("test.mp3"),new byte[]{'I','D','3'});
  new MediaService(db,root.toString(),"http://localhost").remove(id);
  verify(db).update("DELETE FROM media_assets WHERE id=?",id);
  assertFalse(Files.exists(root.resolve("test.mp3")));
 }
 @Test void referencedMusicIsNotDeletedOrSilentlyDetached() throws Exception {
  var db=mock(JdbcTemplate.class);var id=UUID.randomUUID();
  when(db.queryForObject("SELECT count(*) FROM wedding_media_selection WHERE media_id=?",Integer.class,id)).thenReturn(0);
  when(db.queryForObject("SELECT count(*) FROM wedding WHERE music_id=? OR draft_music_id=?",Integer.class,id,id)).thenReturn(1);
  Files.write(root.resolve("test.mp3"),new byte[]{'I','D','3'});
  var error=assertThrows(ResponseStatusException.class,()->new MediaService(db,root.toString(),"http://localhost").remove(id));
  assertEquals(422,error.getStatusCode().value());
  assertEquals("Tệp đang được dùng trong bản nháp hoặc bản đã phát hành.",error.getReason());
  verify(db,never()).update(anyString(),any(UUID.class));
  assertTrue(Files.exists(root.resolve("test.mp3")));
 }
}