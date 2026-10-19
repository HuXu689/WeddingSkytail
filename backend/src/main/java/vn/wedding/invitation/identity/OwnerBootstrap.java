package vn.wedding.invitation.identity;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Credentials are initialization inputs, never a restart-time password reset. */
@Component
public class OwnerBootstrap implements ApplicationRunner {
    private final JdbcTemplate db;
    private final String username;
    private final String password;
    public OwnerBootstrap(JdbcTemplate db, @Value("${app.admin-user}") String username,
                          @Value("${app.admin-password}") String password) {
        this.db=db; this.username=username; this.password=password;
    }
    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // Serialize bootstrap across application instances; table already exists via Flyway.
        db.execute("LOCK TABLE admin_users IN EXCLUSIVE MODE");
        if(db.queryForObject("SELECT count(*) FROM admin_users",Integer.class)>0) return;
        if(username.isBlank() || username.length()>100 || password.length()<12 || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)
            throw new IllegalArgumentException("First bootstrap requires username and password of 12 characters minimum / 72 UTF-8 bytes maximum");
        db.update("INSERT INTO admin_users(username,password_hash) VALUES(?,?)",
            username,"{bcrypt}"+new BCryptPasswordEncoder(12).encode(password));
        db.update("INSERT INTO audit(action,target) VALUES('OWNER_BOOTSTRAP','1')");
    }
}