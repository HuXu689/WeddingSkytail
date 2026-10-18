package vn.wedding.invitation.media;

import java.util.*;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class MediaController {
    private final MediaService media;
    public MediaController(MediaService media){this.media=media;}
    @GetMapping("/api/v1/admin/media") Object list(){return media.list();}
    @PostMapping(value="/api/v1/admin/media",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) Object upload(@RequestPart("file") MultipartFile file){return Map.of("id",media.upload(file));}
    public record Selection(UUID id) {}
    public record Album(List<UUID> ids) {}
    @PutMapping("/api/v1/admin/media/hero/{surface}") void hero(@PathVariable String surface,@RequestBody Selection input){media.selectHero(input.id(),surface);}
    @PutMapping("/api/v1/admin/media/album/{surface}") void album(@PathVariable String surface,@RequestBody Album input){media.selectAlbum(input.ids(),surface);}
    @DeleteMapping("/api/v1/admin/media/{id}") void remove(@PathVariable UUID id){media.remove(id);}
    @GetMapping(value="/api/v1/admin/media/{id}/content",produces=MediaType.IMAGE_JPEG_VALUE) byte[] draft(@PathVariable UUID id){return media.read(id,false);}
    @GetMapping(value="/media/{id}.jpg",produces=MediaType.IMAGE_JPEG_VALUE) byte[] published(@PathVariable UUID id){return media.readApproved(id);}
}