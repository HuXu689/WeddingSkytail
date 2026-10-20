package vn.wedding.invitation.wishes;

import java.util.UUID;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class WishController {
    private final WishService wishes;
    public WishController(WishService wishes) { this.wishes=wishes; }
    public record ModerationInput(String state,long expectedVersion) {}
    public record MessageInput(String message,long expectedVersion) {}
    public record PinInput(@jakarta.validation.constraints.NotNull Boolean pinned,long expectedVersion) {}
    @PutMapping("/admin/wishes/{id}/pin") Object pin(@PathVariable UUID id,@Valid @RequestBody PinInput input) { return wishes.pin(id,input.pinned(),input.expectedVersion()); }
    /** A guest writes a wish only after passing the same gate as the invitation. */
    @PostMapping("/guest/invitations/{id}/wishes") Object submit(@PathVariable UUID id,@Valid @RequestBody WishService.Input input,HttpSession session) { return wishes.submit(id,input,session); }
    /** The author can always re-read their own wishes, including the ones still pending. */
    @GetMapping("/guest/invitations/{id}/wishes") Object mine(@PathVariable UUID id,HttpSession session) { return wishes.mine(id,session); }
    @GetMapping("/admin/wishes") Object queue(@RequestParam(defaultValue="0") int page,@RequestParam(required=false) String state,@RequestParam(required=false) String query) { return wishes.queue(page,state,query); }
    @PostMapping("/admin/wishes/{id}") Object moderate(@PathVariable UUID id,@RequestBody ModerationInput input,java.security.Principal principal) { return wishes.moderate(id,input.state(),input.expectedVersion(),principal); }
    /** The owner may fix a typo before approving; every edit is audited. */
    @PutMapping("/admin/wishes/{id}") Object update(@PathVariable UUID id,@RequestBody MessageInput input) { return wishes.update(id,input.message(),input.expectedVersion()); }
    @DeleteMapping("/admin/wishes/{id}") void remove(@PathVariable UUID id) { wishes.remove(id); }
}