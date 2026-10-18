package vn.wedding.invitation.identity;

import org.springframework.context.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.session.web.http.DefaultCookieSerializer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.session.jdbc.config.annotation.web.http.EnableJdbcHttpSession;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.web.csrf.CsrfToken;
import java.util.Map;

@Configuration
@EnableJdbcHttpSession(maxInactiveIntervalInSeconds = 86400)
public class SecurityConfig {
    @Bean UserDetailsService users(JdbcTemplate db) {
        return username -> db.query("SELECT username,password_hash,enabled FROM admin_users WHERE username=?",
            (rs,n)->User.withUsername(rs.getString("username")).password(rs.getString("password_hash"))
                .disabled(!rs.getBoolean("enabled")).roles("OWNER").build(),username)
            .stream().findFirst().orElseThrow(()->new UsernameNotFoundException("Invalid credentials"));
    }
    @Bean DefaultCookieSerializer cookieSerializer(@Value("${server.servlet.session.cookie.secure}") boolean secure) {
        var cookie=new DefaultCookieSerializer();
        cookie.setCookieName("SESSION"); cookie.setCookiePath("/");
        cookie.setUseHttpOnlyCookie(true); cookie.setUseSecureCookie(secure); cookie.setSameSite("Lax");
        // Deliberately no Domain/domainNamePattern: host-only cookie, owned by Spring.
        return cookie;
    }
    @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(a -> a.requestMatchers("/api/v1/admin/**", "/api/v1/auth/me").hasRole("OWNER").anyRequest().permitAll())
            .csrf(c -> c.csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .formLogin(f -> f.loginProcessingUrl("/api/v1/auth/login").successHandler((q,s,a)->s.setStatus(204)).failureHandler((q,s,e)->s.sendError(401)))
            .logout(l -> l.logoutUrl("/api/v1/auth/logout").logoutSuccessHandler((q,s,a)->s.setStatus(204)))
            .exceptionHandling(e -> e.authenticationEntryPoint((q,s,x)->s.sendError(401)))
            .headers(h -> h.frameOptions(f->f.deny()).addHeaderWriter((q,s)-> {s.setHeader("Referrer-Policy","no-referrer"); s.setHeader("Cache-Control","private, no-store");}))
            .build();
    }
    @RestController
    static class SessionController {
        @GetMapping("/api/v1/session/csrf") Map<String,String> csrf(CsrfToken token) { return Map.of("token",token.getToken(),"headerName",token.getHeaderName()); }
        @GetMapping("/api/v1/auth/me") Map<String,String> me(java.security.Principal principal) { return Map.of("username",principal.getName()); }
        @GetMapping("/api/v1/health") Map<String,String> health() { return Map.of("status","UP"); }
    }
}