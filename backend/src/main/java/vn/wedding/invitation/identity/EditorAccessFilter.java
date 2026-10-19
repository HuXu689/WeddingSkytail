package vn.wedding.invitation.identity;

import java.io.IOException;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Applies the T25 permission matrix after authentication. Unauthenticated calls are left to Spring
 * Security so they keep answering 401, and only known roles may reach an admin endpoint.
 */
@Component
public class EditorAccessFilter extends OncePerRequestFilter {
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        String path=request.getRequestURI();
        if(!path.startsWith("/api/v1/admin/")) { chain.doFilter(request,response); return; }
        Authentication authentication=SecurityContextHolder.getContext().getAuthentication();
        if(authentication==null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) { chain.doFilter(request,response); return; }
        String role=authentication.getAuthorities().stream().map(GrantedAuthority::getAuthority).filter(value->value.startsWith("ROLE_")).map(value->value.substring(5)).findFirst().orElse(null);
        if(AdminPermissions.allows(role,path)) { chain.doFilter(request,response); return; }
        response.setStatus(403);
        response.setContentType("application/problem+json;charset=UTF-8");
        response.getWriter().write("{\"status\":403,\"title\":\"Forbidden\",\"detail\":\"Tài khoản của bạn không có quyền thực hiện thao tác này.\"}");
    }
}