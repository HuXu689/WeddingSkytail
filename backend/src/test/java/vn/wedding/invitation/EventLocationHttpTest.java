package vn.wedding.invitation;

import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import vn.wedding.invitation.common.ApiErrors;
import vn.wedding.invitation.wedding.EventLocationController;
import vn.wedding.invitation.wedding.EventLocationService;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Binding contract only; Spring Security authentication/CSRF is not bypassed in production. */
class EventLocationHttpTest {
    private final EventLocationService service=mock(EventLocationService.class);
    private final MockMvc mvc=MockMvcBuilders.standaloneSetup(new EventLocationController(service)).setControllerAdvice(new ApiErrors()).build();
    @Test void bindsOptionalCoordinatesWithoutChangingLegacyEventRequest() throws Exception {
        UUID id=UUID.randomUUID();
        var input=new EventLocationService.Input(null,null,false,null,3);
        when(service.save(id,input)).thenReturn(Map.of("version",4));
        mvc.perform(put("/api/v1/admin/events/"+id+"/location").contentType("application/json").content("{\"latitude\":null,\"longitude\":null,\"confirmed\":false,\"expectedVersion\":3}"))
            .andExpect(status().isOk()).andExpect(content().json("{\"version\":4}"));
        verify(service).save(id,input);
    }
    @Test void versionConflictIs409() throws Exception {
        doAnswer(invocation->{ApiErrors.version(4,3);return null;}).when(service).save(any(),any());
        mvc.perform(put("/api/v1/admin/events/"+UUID.randomUUID()+"/location").contentType("application/json").content("{\"confirmed\":false,\"expectedVersion\":3}"))
            .andExpect(status().isConflict());
    }
    @Test void malformedCoordinatesAreBadRequest() throws Exception {
        mvc.perform(put("/api/v1/admin/events/"+UUID.randomUUID()+"/location").contentType("application/json").content("{\"latitude\":\"not-a-number\"}"))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}