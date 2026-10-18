package vn.wedding.invitation.invitations;

import java.util.*;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import vn.wedding.invitation.rsvp.RsvpService;

@RestController
@RequestMapping("/api/v1")
public class GuestController {
    private final GuestService guests;
    private final RsvpService rsvp;
    public GuestController(GuestService guests,RsvpService rsvp) { this.guests=guests; this.rsvp=rsvp; }
    public record Redeem(String token) {}
    @GetMapping("/guest/invitations/{id}/state") Object state(@PathVariable UUID id,HttpSession session) { return guests.state(id,session); }
    @PostMapping("/guest-links/redeem") Object redeem(@RequestBody Redeem body,HttpSession session) { return Map.of("invitationId",guests.redeem(body.token(),session)); }
    @PostMapping("/guest/invitations/{id}/open") Object open(@PathVariable UUID id,HttpSession session,java.security.Principal principal) { guests.open(id,session,principal!=null); return Map.of("opened",true); }
    @GetMapping("/guest/invitations/{id}") Object view(@PathVariable UUID id,HttpSession session) { return guests.view(id,session); }
    @PutMapping("/guest/invitations/{id}/events/{eventId}/rsvp") Object save(@PathVariable UUID id,@PathVariable UUID eventId,@RequestHeader("Idempotency-Key") UUID key,@Valid @RequestBody RsvpService.Input input,HttpSession session) { return rsvp.save(id,eventId,key,input,session); }
    @GetMapping("/public/weddings/{slug}") Object wedding(@PathVariable String slug) { return guests.publicWedding(slug); }
}