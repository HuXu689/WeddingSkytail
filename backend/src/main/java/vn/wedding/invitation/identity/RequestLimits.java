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
        if(request.getMethod().equals("POST") && (path.equals("/api/v1/auth/login") || path.equals("/api/v1/guest-links/redeem"))) {
            long minute=System.currentTimeMillis()/60000;
            if(windows.size()>10000) windows.entrySet().removeIf(e->e.getValue().minute()<minute);
            // Remote address is the direct peer. Proxy deployment shares this conservative ceiling.
            String key=request.getRemoteAddr()+":"+path;
            if(windows.size()>10000 && !windows.containsKey(key)) { response.setStatus(429); response.setHeader("Retry-After","60"); return; }
            Window window=windows.compute(key,(k,v)->v==null||v.minute()!=minute?new Window(minute,1):new Window(minute,v.count()+1));
            int limit=path.endsWith("login")?30:300;
            if(window.count()>limit) { response.setStatus(429); response.setHeader("Retry-After","60"); return; }
        }
        chain.doFilter(request,response);
    }
}