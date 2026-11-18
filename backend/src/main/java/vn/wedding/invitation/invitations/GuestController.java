package vn.wedding.invitation.invitations;

import java.util.*;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.wedding.invitation.access.PinService;
import vn.wedding.invitation.rsvp.RsvpService;

@RestController
@RequestMapping("/api/v1")
public class GuestController {
    private final GuestService guests;
    private final RsvpService rsvp;
    private final PinService pins;
    public GuestController(GuestService guests,RsvpService rsvp,PinService pins) { this.guests=guests; this.rsvp=rsvp; this.pins=pins; }
    public record Redeem(String token) {}
    public record HeartInput(Integer count) {}
    @GetMapping("/guest/invitations/{id}/state") Object state(@PathVariable UUID id,HttpSession session) { return guests.state(id,session); }
    @PostMapping("/guest/invitations/{id}/pin") Object verifyPin(@PathVariable UUID id,@RequestBody PinService.Set body,HttpSession session) { return pins.verify(id,body.pin(),session); }
    @PostMapping("/guest-links/redeem") Object redeem(@RequestBody Redeem body,HttpSession session) { return Map.of("invitationId",guests.redeem(body.token(),session)); }
    @PostMapping("/guest/invitations/{id}/open") Object open(@PathVariable UUID id,HttpSession session,java.security.Principal principal) { guests.open(id,session,principal!=null); return Map.of("opened",true); }
    @GetMapping("/guest/invitations/{id}") Object view(@PathVariable UUID id,HttpSession session) { return guests.view(id,session); }
    @PostMapping("/guest/invitations/{id}/hearts") Object guestHearts(@PathVariable UUID id,@RequestBody(required=false) HeartInput body,HttpSession session) { return guests.sendGuestWeddingHearts(id,body==null||body.count()==null?1:body.count(),session); }
    @PutMapping("/guest/invitations/{id}/events/{eventId}/rsvp") Object save(@PathVariable UUID id,@PathVariable UUID eventId,@RequestHeader("Idempotency-Key") UUID key,@Valid @RequestBody RsvpService.Input input,HttpSession session) { return rsvp.save(id,eventId,key,input,session); }
    @GetMapping("/public/weddings/{slug}") Object wedding(@PathVariable String slug) { return guests.publicWedding(slug); }
    @PostMapping("/public/weddings/{slug}/hearts") Object publicHearts(@PathVariable String slug,@RequestBody(required=false) HeartInput body) { return guests.sendPublicWeddingHearts(slug,body==null||body.count()==null?1:body.count()); }
    /** Calendar file for one invited event. Same gate as the invitation; the browser downloads it with the session cookie. */
    @GetMapping(value="/guest/invitations/{id}/events/{eventId}/calendar.ics",produces="text/calendar;charset=UTF-8")
    ResponseEntity<byte[]> calendar(@PathVariable UUID id,@PathVariable UUID eventId,HttpSession session) {
        var event=guests.calendar(id,eventId,session);
        byte[] body=CalendarFile.build(event,java.time.Instant.now()).getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return ResponseEntity.ok().contentType(new MediaType("text","calendar",java.nio.charset.StandardCharsets.UTF_8)).header("Content-Disposition","attachment; filename=\"thiep-cuoi.ics\"").body(body);
    }
}