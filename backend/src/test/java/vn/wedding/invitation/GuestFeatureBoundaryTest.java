package vn.wedding.invitation;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import vn.wedding.invitation.access.AccessGate;
import vn.wedding.invitation.invitations.GuestService;
import vn.wedding.invitation.invitations.TokenService;
import vn.wedding.invitation.media.MediaService;
import vn.wedding.invitation.wishes.WishService;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** F01 baseline: synthetic inputs only; never connects to a database or redeems a real link. */
class GuestFeatureBoundaryTest {
    private final JdbcTemplate db=mock(JdbcTemplate.class);
    private final AccessGate gate=mock(AccessGate.class);
    private final MediaService media=mock(MediaService.class);
    private final WishService wishes=mock(WishService.class);
    private final GuestService service=new GuestService(db,gate,mock(TokenService.class),media,wishes);

    @Test void deniedInvitationCannotLoadEventsMediaOrWishes() {
        UUID id=UUID.randomUUID();
        var session=new MockHttpSession();
        when(gate.check(id,session,true)).thenThrow(new IllegalStateException("Fixture: denied"));
        assertThrows(IllegalStateException.class,()->service.view(id,session));
        verifyNoInteractions(db,media,wishes);
    }

    @Test void deniedCalendarCannotQueryEventDetails() {
        UUID id=UUID.randomUUID();
        var session=new MockHttpSession();
        when(gate.check(id,session,true)).thenThrow(new IllegalStateException("Fixture: denied"));
        assertThrows(IllegalStateException.class,()->service.calendar(id,UUID.randomUUID(),session));
        verifyNoInteractions(db,media,wishes);
    }

    @Test void unpublishedPublicWeddingCannotLoadMediaOrWishFeed() {
        assertThrows(RuntimeException.class,()->service.publicWedding("fixture-unpublished"));
        verifyNoInteractions(media,wishes);
    }
}