package vn.wedding.invitation.gifts;

import java.util.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class GiftController {
    private final GiftService gifts;
    public GiftController(GiftService gifts){this.gifts=gifts;}
    @GetMapping("/api/v1/admin/gifts") Object configuration(){return gifts.configuration();}
    @PutMapping("/api/v1/admin/gifts") Object save(@RequestBody GiftService.Input input){return gifts.save(input);}
    @PostMapping("/api/v1/admin/gifts/publish") Object publish(@RequestBody GiftService.Publish input){return gifts.publish(input);}
    @PostMapping(value="/api/v1/admin/gifts/assets",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    Object upload(@RequestPart("file") MultipartFile file){return Map.of("id",gifts.upload(file));}
    @GetMapping("/api/v1/admin/gifts/assets/{assetId}") ResponseEntity<byte[]> ownerAsset(@PathVariable UUID assetId){return png(gifts.ownerAsset(assetId));}
    @GetMapping("/api/v1/public/weddings/{slug}/gifts") ResponseEntity<GiftService.View> publicView(@PathVariable String slug){return response(gifts.publicView(slug));}
    @GetMapping("/api/v1/guest/invitations/{id}/gifts") ResponseEntity<GiftService.View> guestView(@PathVariable UUID id,HttpServletRequest request){return response(gifts.guestView(id,request.getSession(false)));}
    @GetMapping("/api/v1/public/weddings/{slug}/gifts/assets/{assetId}") ResponseEntity<byte[]> publicAsset(@PathVariable String slug,@PathVariable UUID assetId){return png(gifts.publicAsset(slug,assetId));}
    @GetMapping("/api/v1/guest/invitations/{id}/gifts/assets/{assetId}") ResponseEntity<byte[]> guestAsset(@PathVariable UUID id,@PathVariable UUID assetId,HttpServletRequest request){return png(gifts.guestAsset(id,request.getSession(false),assetId));}
    private static <T> ResponseEntity<T> response(T body){return ResponseEntity.ok().header("Cache-Control","no-store, private").header("Referrer-Policy","no-referrer").body(body);}
    private static ResponseEntity<byte[]> png(byte[] bytes){return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).header("Cache-Control","no-store, private").header("X-Content-Type-Options","nosniff").header("Referrer-Policy","no-referrer").body(bytes);}
}