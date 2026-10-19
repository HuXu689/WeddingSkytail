package vn.wedding.invitation.media;

import java.util.*;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
    public record Focal(int x,int y) {}
    @PutMapping("/api/v1/admin/media/hero/{surface}") void hero(@PathVariable String surface,@RequestBody Selection input){media.selectHero(input.id(),surface);}
    @PutMapping("/api/v1/admin/media/{id}/focal/{surface}") void focal(@PathVariable UUID id,@PathVariable String surface,@RequestBody Focal input){media.focal(id,surface,input.x(),input.y());}
    @PutMapping("/api/v1/admin/media/album/{surface}") void album(@PathVariable String surface,@RequestBody Album input){media.selectAlbum(input.ids(),surface);}
    @DeleteMapping("/api/v1/admin/media/{id}") void remove(@PathVariable UUID id){media.remove(id);}
    @GetMapping(value="/api/v1/admin/media/{id}/content",produces=MediaType.IMAGE_JPEG_VALUE) byte[] draft(@PathVariable UUID id){return media.read(id,false);}
    @GetMapping(value="/media/{id}.jpg",produces=MediaType.IMAGE_JPEG_VALUE) byte[] published(@PathVariable UUID id){return media.readApproved(id);}
    /** Background music (P1): never autoplayed by the browser, but served with the right type so audio players work. */
    @PostMapping(value="/api/v1/admin/media/audio",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) Object uploadMusic(@RequestPart("file") MultipartFile file){return Map.of("id",media.uploadMusic(file));}
    @GetMapping(value="/api/v1/admin/media/{id}/audio") ResponseEntity<byte[]> assetAudio(@PathVariable UUID id){return audio(media.assetMime(id),media.asset(id));}
    @GetMapping(value="/api/v1/admin/media/audio") ResponseEntity<byte[]> draftMusic(){return audio(media.musicMime(false),media.music(false));}
    @GetMapping(value="/api/v1/media/audio") ResponseEntity<byte[]> publishedMusic(){return audio(media.musicMime(true),media.music(true));}
    private ResponseEntity<byte[]> audio(String mime,byte[] body){return ResponseEntity.ok().contentType(MediaType.parseMediaType(mime)).header("Cache-Control","no-store").body(body);}
}