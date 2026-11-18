package vn.wedding.invitation.wishes;

import java.util.UUID;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class WishFeedController {
    private final WishFeedService feed;
    public WishFeedController(WishFeedService feed){this.feed=feed;}
    public record HeartInput(Integer count) {}
    @GetMapping("/public/weddings/{slug}/wishes")
    ResponseEntity<WishFeedService.Page> publicFeed(@PathVariable String slug,@RequestParam(required=false) String cursor){
        return response(feed.publicFeed(slug,cursor));
    }
    @PostMapping("/public/weddings/{slug}/wishes/{wishId}/hearts")
    ResponseEntity<?> heartPublicWish(@PathVariable String slug,@PathVariable UUID wishId,@RequestBody(required=false) HeartInput body){
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(feed.heartPublicWish(slug,wishId,body==null||body.count()==null?1:body.count()));
    }
    @GetMapping("/guest/invitations/{id}/approved-wishes")
    ResponseEntity<WishFeedService.Page> guestFeed(@PathVariable UUID id,HttpSession session,@RequestParam(required=false) String cursor){
        return response(feed.guestFeed(id,session,cursor));
    }
    @PostMapping("/guest/invitations/{id}/approved-wishes/{wishId}/hearts")
    ResponseEntity<?> heartGuestWish(@PathVariable UUID id,@PathVariable UUID wishId,@RequestBody(required=false) HeartInput body,HttpSession session){
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(feed.heartGuestWish(id,wishId,body==null||body.count()==null?1:body.count(),session));
    }
    private static ResponseEntity<WishFeedService.Page> response(WishFeedService.Page page){
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(page);
    }
}