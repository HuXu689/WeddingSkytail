package vn.wedding.invitation;

import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.*;
import vn.wedding.invitation.access.AccessGate;
import vn.wedding.invitation.invitations.TokenService;
import vn.wedding.invitation.rsvp.RsvpService;
import static org.junit.jupiter.api.Assertions.*;

class CoreRulesTest {
    @Test void scheduleHasInclusiveStartExclusiveEnd() {
        Instant start=Instant.parse("2027-01-01T00:00:00Z"),end=start.plusSeconds(60);
        assertFalse(AccessGate.allows("SCHEDULED",start,end,start.minusNanos(1)));
        assertTrue(AccessGate.allows("SCHEDULED",start,end,start));
        assertFalse(AccessGate.allows("SCHEDULED",start,end,end));
        assertTrue(AccessGate.allows("SCHEDULED",start,null,end));
        assertFalse(AccessGate.allows("MANUAL_CLOSED",null,null,start));
    }
    @Test void tokenRoundtripBindsInvitation() {
        TokenService service=new TokenService(Base64.getEncoder().encodeToString(new byte[32]));
        UUID id=UUID.randomUUID(); String token=service.mint(),cipher=service.encrypt(token,id);
        assertTrue(token.matches("[A-Za-z0-9_-]{43}")); assertEquals(token,service.decrypt(cipher,id));
        assertThrows(IllegalStateException.class,()->service.decrypt(cipher,UUID.randomUUID()));
        assertNotEquals(cipher,service.encrypt(token,id)); assertEquals(64,TokenService.hash(token).length());
    }
    @Test void peopleCountRules() {
        assertDoesNotThrow(()->RsvpService.validatePeople(new RsvpService.Input("ATTENDING",3,"",0),3));
        assertDoesNotThrow(()->RsvpService.validatePeople(new RsvpService.Input("DECLINED",0,"",0),3));
        assertThrows(Exception.class,()->RsvpService.validatePeople(new RsvpService.Input("ATTENDING",4,"",0),3));
        assertThrows(Exception.class,()->RsvpService.validatePeople(new RsvpService.Input("ATTENDING",0,"",0),3));
        assertThrows(Exception.class,()->RsvpService.validatePeople(new RsvpService.Input("DECLINED",1,"",0),3));
    }
}