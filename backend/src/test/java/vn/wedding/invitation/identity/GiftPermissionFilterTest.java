package vn.wedding.invitation.identity;

import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import jakarta.servlet.FilterChain;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Exercises the real permission filter; unauthenticated handling remains Spring Security's job. */
class GiftPermissionFilterTest {
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    private void role(String role){
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("fixture-user",null,List.of(new SimpleGrantedAuthority("ROLE_"+role))));
    }
    @Test void editorCannotReachGiftConfigurationOrAssets() throws Exception {
        role("EDITOR");
        for(String path:List.of("/api/v1/admin/gifts","/api/v1/admin/gifts/assets/fixture","/api/v1/admin/gifts/publish")){
            var request=new MockHttpServletRequest("GET",path);var response=new MockHttpServletResponse();var chain=mock(FilterChain.class);
            new EditorAccessFilter().doFilter(request,response,chain);
            assertEquals(403,response.getStatus());verifyNoInteractions(chain);
        }
    }
    @Test void ownerCanReachGiftRoutes() throws Exception {
        role("OWNER");var chain=mock(FilterChain.class);
        new EditorAccessFilter().doFilter(new MockHttpServletRequest("PUT","/api/v1/admin/gifts/draft"),new MockHttpServletResponse(),chain);
        verify(chain).doFilter(any(),any());
    }
    @Test void editorRetainsEventLocationEditing() throws Exception {
        role("EDITOR");var chain=mock(FilterChain.class);
        new EditorAccessFilter().doFilter(new MockHttpServletRequest("PUT","/api/v1/admin/events/fixture/location"),new MockHttpServletResponse(),chain);
        verify(chain).doFilter(any(),any());
    }
}