package vn.wedding.invitation.identity;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Single-instance, bounded transient abuse protection. Never stores bearer tokens. */
@Component
public class RequestLimits extends OncePerRequestFilter {
    private record Window(long minute,int count) {}
    private final ConcurrentHashMap<String,Window> windows=new ConcurrentHashMap<>();
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        String path=request.getRequestURI();
        // PIN verification is throttled much tighter than the other POST endpoints (FR19).
        boolean pinAttempt=request.getMethod().equals("POST") && path.startsWith("/api/v1/guest/invitations/") && path.endsWith("/pin");
        // Wishes are user-generated content: a modest per-address ceiling on top of the per-invitation cap (T24).
        boolean wishAttempt=request.getMethod().equals("POST") && path.startsWith("/api/v1/guest/invitations/") && path.endsWith("/wishes");
        if(request.getMethod().equals("POST") && (pinAttempt || wishAttempt || path.equals("/api/v1/auth/login") || path.equals("/api/v1/guest-links/redeem"))) {
            long minute=System.currentTimeMillis()/60000;
            if(windows.size()>10000) windows.entrySet().removeIf(e->e.getValue().minute()<minute);
            // Remote address is the direct peer. Proxy deployment shares this conservative ceiling.
            String key=request.getRemoteAddr()+":"+path;
            if(windows.size()>10000 && !windows.containsKey(key)) { response.setStatus(429); response.setHeader("Retry-After","60"); return; }
            Window window=windows.compute(key,(k,v)->v==null||v.minute()!=minute?new Window(minute,1):new Window(minute,v.count()+1));
            int limit=pinAttempt?10:wishAttempt?20:path.endsWith("login")?30:300;
            if(window.count()>limit) { response.setStatus(429); response.setHeader("Retry-After","60"); return; }
        }
        chain.doFilter(request,response);
    }
}