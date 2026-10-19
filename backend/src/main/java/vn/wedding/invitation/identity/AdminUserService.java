package vn.wedding.invitation.identity;

import java.nio.charset.StandardCharsets;
import java.util.*;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.wedding.invitation.common.ApiErrors;

/**
 * Account management for the two roles (T25). Passwords are only ever stored as BCrypt hashes,
 * never returned and never logged; the last enabled owner can never be removed, disabled or demoted.
 */
@Service
@Transactional
public class AdminUserService {
    private final JdbcTemplate db;
    private final BCryptPasswordEncoder encoder=new BCryptPasswordEncoder(12);
    public AdminUserService(JdbcTemplate db) { this.db=db; }
    public record Create(@NotBlank @Size(min=3,max=60) String username,@Size(max=100) String displayName,@NotBlank @Size(min=12,max=100) String password,@NotBlank String role) {}
    public record RoleInput(@NotBlank String role) {}
    public record EnabledInput(boolean enabled) {}
    public record PasswordReset(@NotBlank @Size(min=12,max=100) String password) {}
    public record PasswordChange(@NotBlank @Size(min=12,max=100) String currentPassword,@NotBlank @Size(min=12,max=100) String newPassword) {}
    private static final List<String> ROLES=List.of("OWNER","EDITOR");
    public List<Map<String,Object>> list() { return db.queryForList("SELECT username,role,display_name,enabled,created_at,created_by FROM admin_users ORDER BY role,username"); }
    private String actor() { var authentication=SecurityContextHolder.getContext().getAuthentication(); return authentication==null||authentication.getName()==null?"owner":authentication.getName(); }
    private void audit(String action,String target) { db.update("INSERT INTO audit(action,target,actor) VALUES(?,?,?)",action,target,actor()); }
    private long enabledOwners() { return db.queryForObject("SELECT count(*) FROM admin_users WHERE role='OWNER' AND enabled",Long.class); }
    private Map<String,Object> require(String username) {
        var rows=db.queryForList("SELECT * FROM admin_users WHERE lower(username)=lower(?) FOR UPDATE",username);
        ApiErrors.require(!rows.isEmpty(),"Tài khoản không tồn tại.");
        return rows.getFirst();
    }
    /** BCrypt refuses inputs longer than 72 bytes, so the limit is checked before hashing instead of failing later. */
    private static void requirePassword(String password) {
        ApiErrors.require(password!=null && password.length()>=12,"Mật khẩu cần ít nhất 12 ký tự.");
        ApiErrors.require(password.length()<=100 && password.getBytes(StandardCharsets.UTF_8).length<=72,"Mật khẩu quá dài.");
    }
    private static String requireRole(String role) {
        String normalized=role==null?"":role.toUpperCase(Locale.ROOT);
        ApiErrors.require(ROLES.contains(normalized),"Vai trò không hợp lệ.");
        return normalized;
    }
    public Map<String,Object> create(Create input) {
        String username=input.username().trim();
        ApiErrors.require(username.matches("[A-Za-z0-9._-]{3,60}"),"Tên đăng nhập chỉ dùng chữ, số và . _ - (3–60 ký tự).");
        requirePassword(input.password());
        String role=requireRole(input.role());
        ApiErrors.require(db.queryForObject("SELECT count(*) FROM admin_users WHERE lower(username)=lower(?)",Integer.class,username)==0,"Tên đăng nhập đã được dùng.");
        db.update("INSERT INTO admin_users(username,password_hash,display_name,role,enabled,created_by) VALUES(?,?,?,?,true,?)",username,"{bcrypt}"+encoder.encode(input.password()),input.displayName()==null?"":input.displayName().trim(),role,actor());
        audit("USER_CREATE",username);
        return Map.of("username",username,"role",role);
    }
    /** A disabled, deleted or reset account must lose its live sessions immediately, not at session expiry. */
    private void killSessions(String username) {
        db.update("DELETE FROM spring_session WHERE principal_name=?",username);
        audit("USER_SESSIONS_CLEARED",username);
    }
    /** Nobody may lock the wedding out: the last enabled owner stays owner and stays enabled. */
    public void setRole(String username,String role) {
        String normalized=requireRole(role);
        var row=require(username);
        if("OWNER".equals(row.get("role")) && !"OWNER".equals(normalized)) ApiErrors.require(enabledOwners()>1,"Không thể hạ vai trò của chủ tiệc cuối cùng.");
        db.update("UPDATE admin_users SET role=? WHERE lower(username)=lower(?)",normalized,username);
        audit("USER_ROLE",username);
    }
    public void setEnabled(String username,boolean enabled) {
        var row=require(username);
        if(!enabled) {
            ApiErrors.require(!username.equalsIgnoreCase(actor()),"Không thể tự khóa tài khoản đang dùng.");
            if("OWNER".equals(row.get("role"))) ApiErrors.require(enabledOwners()>1,"Không thể khóa chủ tiệc cuối cùng.");
        }
        db.update("UPDATE admin_users SET enabled=? WHERE lower(username)=lower(?)",enabled,username);
        if(!enabled) killSessions(username);
        audit(enabled?"USER_ENABLE":"USER_DISABLE",username);
    }
    public void resetPassword(String username,String password) {
        require(username); requirePassword(password);
        db.update("UPDATE admin_users SET password_hash=? WHERE lower(username)=lower(?)","{bcrypt}"+encoder.encode(password),username);
        killSessions(username);
        audit("USER_PASSWORD_RESET",username);
    }
    /** Self-service change: the current password must be proven, so a stolen session alone is not enough. */
    public void changeOwnPassword(String username,String currentPassword,String newPassword) {
        var row=db.queryForList("SELECT password_hash FROM admin_users WHERE username=? AND enabled",username);
        ApiErrors.require(!row.isEmpty(),"Tài khoản không tồn tại hoặc đã bị khóa.");
        String hash=String.valueOf(row.getFirst().get("password_hash"));
        ApiErrors.require(encoder.matches(currentPassword,hash.startsWith("{bcrypt}")?hash.substring(8):hash),"Mật khẩu hiện tại không đúng.");
        requirePassword(newPassword);
        ApiErrors.require(!encoder.matches(newPassword,hash.startsWith("{bcrypt}")?hash.substring(8):hash),"Mật khẩu mới cần khác mật khẩu hiện tại.");
        db.update("UPDATE admin_users SET password_hash=? WHERE username=?","{bcrypt}"+encoder.encode(newPassword),username);
        audit("USER_PASSWORD_CHANGE",username);
    }
    public void remove(String username) {
        var row=require(username);
        ApiErrors.require(!username.equalsIgnoreCase(actor()),"Không thể xóa tài khoản đang dùng.");
        if("OWNER".equals(row.get("role"))) ApiErrors.require(enabledOwners()>1,"Không thể xóa chủ tiệc cuối cùng.");
        db.update("DELETE FROM admin_users WHERE lower(username)=lower(?)",username);
        killSessions(username);
        audit("USER_DELETE",username);
    }
}