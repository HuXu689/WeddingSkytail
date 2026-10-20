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
    @GetMapping("/public/weddings/{slug}/wishes")
    ResponseEntity<WishFeedService.Page> publicFeed(@PathVariable String slug,@RequestParam(required=false) String cursor){
        return response(feed.publicFeed(slug,cursor));
    }
    @GetMapping("/guest/invitations/{id}/approved-wishes")
    ResponseEntity<WishFeedService.Page> guestFeed(@PathVariable UUID id,HttpSession session,@RequestParam(required=false) String cursor){
        return response(feed.guestFeed(id,session,cursor));
    }
    private static ResponseEntity<WishFeedService.Page> response(WishFeedService.Page page){
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(page);
    }
}