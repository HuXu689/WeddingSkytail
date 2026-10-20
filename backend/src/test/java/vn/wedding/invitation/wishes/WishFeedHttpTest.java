package vn.wedding.invitation.wishes;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import vn.wedding.invitation.access.AccessGate;
import vn.wedding.invitation.common.ApiErrors;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Controller/serialization tests, not a replacement for the complete Spring Security filter chain. */
class WishFeedHttpTest {
    private final JdbcTemplate db=mock(JdbcTemplate.class);
    private final AccessGate gate=mock(AccessGate.class);
    private final WishFeedService feed=new WishFeedService(db,gate);
    private final MockMvc mvc=MockMvcBuilders.standaloneSetup(new WishFeedController(feed)).setControllerAdvice(new ApiErrors()).build();

    @Test void deniedGuestGetsForbiddenAndNoFeedQuery() throws Exception {
        UUID id=UUID.randomUUID();var session=new MockHttpSession();
        when(gate.check(id,session,true)).thenThrow(ApiErrors.unavailable());
        mvc.perform(get("/api/v1/guest/invitations/"+id+"/approved-wishes").session(session))
            .andExpect(status().isForbidden());
        verifyNoInteractions(db);
    }
    @Test void malformedCursorGetsValidationResponseAfterGate() throws Exception {
        UUID id=UUID.randomUUID();var session=new MockHttpSession();
        mvc.perform(get("/api/v1/guest/invitations/"+id+"/approved-wishes").session(session).param("cursor","bad"))
            .andExpect(status().isUnprocessableEntity());
        verify(gate).check(id,session,true);verifyNoInteractions(db);
    }
    @Test void responseHasExplicitNoStoreAndEmptyPageContract() throws Exception {
        UUID id=UUID.randomUUID();var session=new MockHttpSession();
        mvc.perform(get("/api/v1/guest/invitations/"+id+"/approved-wishes").session(session))
            .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store, private"))
            .andExpect(content().json("{\"items\":[],\"nextCursor\":null}"));
    }
    @Test void unpublishedPublicFeedIsForbidden() throws Exception {
        mvc.perform(get("/api/v1/public/weddings/fixture/wishes")).andExpect(status().isForbidden());
    }
    @Test void legacyPublicPayloadAlsoExcludesEventSpecificWishes(){
        new WishService(db,gate).approvedPublic();
        verify(db).queryForList("SELECT display_name,message,created_at FROM wishes WHERE state='APPROVED' AND event_id IS NULL ORDER BY created_at DESC,id DESC LIMIT 30");
    }
}