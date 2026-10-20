package vn.wedding.invitation;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.file.Path;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import vn.wedding.invitation.media.MediaService;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MediaUploadLimitsTest {
    @TempDir Path root;

    private MultipartFile upload(long size, byte[] content) throws Exception {
        var file=mock(MultipartFile.class);
        when(file.getSize()).thenReturn(size);
        when(file.getOriginalFilename()).thenReturn("test-media");
        when(file.getInputStream()).thenAnswer(call->new ByteArrayInputStream(content));
        return file;
    }

    @Test void acceptsImageAt100Mb() throws Exception {
        var content=new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2,2,BufferedImage.TYPE_INT_RGB),"PNG",content);
        var service=new MediaService(mock(JdbcTemplate.class),root.toString(),"http://localhost");
        assertNotNull(service.upload(upload(100L*1024*1024,content.toByteArray())));
    }

    @Test void rejectsImageAbove100Mb() throws Exception {
        var db=mock(JdbcTemplate.class);
        var service=new MediaService(db,root.toString(),"http://localhost");
        var file=upload(100L*1024*1024+1,new byte[0]);
        var error=assertThrows(ResponseStatusException.class,()->service.upload(file));
        assertEquals("Ảnh không được lớn hơn 100 MB.",error.getReason());
        verify(file,never()).getInputStream();
        verifyNoInteractions(db);
    }

    @Test void acceptsMusicAt20Mb() throws Exception {
        var service=new MediaService(mock(JdbcTemplate.class),root.toString(),"http://localhost");
        assertNotNull(service.uploadMusic(upload(20L*1024*1024,new byte[]{'I','D','3',0})));
    }

    @Test void rejectsMusicAbove20Mb() throws Exception {
        var db=mock(JdbcTemplate.class);
        var service=new MediaService(db,root.toString(),"http://localhost");
        var file=upload(20L*1024*1024+1,new byte[0]);
        var error=assertThrows(ResponseStatusException.class,()->service.uploadMusic(file));
        assertEquals("Tệp nhạc không được lớn hơn 20 MB.",error.getReason());
        verify(file,never()).getInputStream();
        verifyNoInteractions(db);
    }
}