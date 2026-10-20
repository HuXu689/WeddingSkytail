package vn.wedding.invitation.gifts;

import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import vn.wedding.invitation.common.ApiErrors;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Standalone binding/headers only; full auth and CSRF remain a separate integration gate. */
class GiftHttpTest {
    final GiftService gifts=mock(GiftService.class);
    final MockMvc mvc=MockMvcBuilders.standaloneSetup(new GiftController(gifts)).setControllerAdvice(new ApiErrors()).build();
    @Test void publicDisabledPayloadHasNoRecipientDataAndIsNotCached() throws Exception {
        when(gifts.publicView("fixture")).thenReturn(new GiftService.View(false,"SINGLE",List.of()));
        mvc.perform(get("/api/v1/public/weddings/fixture/gifts")).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store, private")).andExpect(content().json("{\"enabled\":false,\"mode\":\"SINGLE\",\"recipients\":[]}"));
    }
    @Test void assetHasPngAndNoSniffHeaders() throws Exception {
        UUID asset=UUID.randomUUID();when(gifts.publicAsset("fixture",asset)).thenReturn(new byte[]{1,2});
        mvc.perform(get("/api/v1/public/weddings/fixture/gifts/assets/"+asset)).andExpect(status().isOk()).andExpect(content().contentType("image/png")).andExpect(header().string("X-Content-Type-Options","nosniff")).andExpect(header().string("Cache-Control","no-store, private"));
    }
    @Test void missingSessionIsNotCreatedByGuestEndpoint() throws Exception {
        UUID id=UUID.randomUUID();when(gifts.guestView(id,null)).thenThrow(ApiErrors.unavailable());
        mvc.perform(get("/api/v1/guest/invitations/"+id+"/gifts")).andExpect(status().isForbidden()).andExpect(cookie().doesNotExist("SESSION"));verify(gifts).guestView(id,null);
    }
    @Test void publishBindsBothRevisionsAndConfirmation() throws Exception {
        when(gifts.publish(any())).thenReturn(Map.of("revision",4L));
        mvc.perform(post("/api/v1/admin/gifts/publish").contentType("application/json").content("{\"expectedRevision\":2,\"expectedPublishedRevision\":3,\"confirmed\":true}"))
            .andExpect(status().isOk()).andExpect(content().json("{\"revision\":4}"));
        verify(gifts).publish(new GiftService.Publish(2,3,true));
    }
}