package vn.wedding.invitation.identity;

import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import vn.wedding.invitation.common.ApiErrors;

/** Owner-only account management; every branch is additionally protected by the T25 matrix. */
@RestController
public class AdminUserController {
    private final AdminUserService users;
    public AdminUserController(AdminUserService users) { this.users=users; }
    @GetMapping("/api/v1/admin/users") Object list() { return users.list(); }
    @PostMapping("/api/v1/admin/users") Object create(@Valid @RequestBody AdminUserService.Create input) { return users.create(input); }
    @PutMapping("/api/v1/admin/users/{username}/role") void role(@PathVariable String username,@Valid @RequestBody AdminUserService.RoleInput input) { users.setRole(username,input.role()); }
    @PutMapping("/api/v1/admin/users/{username}/enabled") void enabled(@PathVariable String username,@RequestBody AdminUserService.EnabledInput input) { users.setEnabled(username,input.enabled()); }
    @PutMapping("/api/v1/admin/users/{username}/password") void reset(@PathVariable String username,@Valid @RequestBody AdminUserService.PasswordReset input) { users.resetPassword(username,input.password()); }
    @DeleteMapping("/api/v1/admin/users/{username}") void remove(@PathVariable String username) { users.remove(username); }
    /**
     * Any signed-in account changes its own password. Deliberately outside /admin/users, because that
     * prefix is owner-only in the matrix, while this action must stay available to an editor too.
     */
    @PutMapping("/api/v1/auth/password") void changeOwn(@Valid @RequestBody AdminUserService.PasswordChange input,java.security.Principal principal) {
        ApiErrors.require(principal!=null,"Vui lòng đăng nhập lại.");
        users.changeOwnPassword(principal.getName(),input.currentPassword(),input.newPassword());
    }
}