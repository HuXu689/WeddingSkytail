package vn.wedding.invitation.identity;

import java.util.List;
import java.util.Set;

/**
 * Permission matrix for the two roles (T25). Deliberately pure and static: the rule that decides who may
 * call which admin endpoint is unit tested, and the filter only applies it.
 * OWNER keeps every right. EDITOR helps with content, guests, RSVP, wishes and reminders but never
 * touches credentials, link/PIN secrets, exports, access policy, publishing or import commits (docs/16).
 */
public final class AdminPermissions {
    private AdminPermissions() {}
    private static final Set<String> ROLES=Set.of("OWNER","EDITOR");
    /** Whole areas an editor never sees, matched by path prefix. */
    private static final List<String> EDITOR_DENIED=List.of(
        "/api/v1/admin/users","/api/v1/admin/audit","/api/v1/admin/access-policy","/api/v1/admin/imports/commit",
        "/api/v1/admin/exports","/api/v1/admin/reports/","/api/v1/admin/wedding/publish","/api/v1/admin/wedding/unpublish",
        "/api/v1/admin/wedding/tracking","/api/v1/admin/invitations/bulk-policy");
    /** Per-target security actions: an editor must not mint, reveal or kill credentials. */
    private static final List<String> EDITOR_DENIED_PATTERNS=List.of(
        "/api/v1/admin/invitations/[^/]+/pin(/.*)?",
        "/api/v1/admin/invitations/[^/]+/link-reveal(/.*)?",
        "/api/v1/admin/invitations/[^/]+/(revoke|rotate)",
        "/api/v1/admin/invitations/[^/]+/access-policy",
        "/api/v1/admin/events/[^/]+/(publish|cancel)");
    public static boolean known(String role) { return role!=null && ROLES.contains(role); }
    public static boolean allows(String role,String path) {
        if(role==null) return false;
        if(path==null || !path.startsWith("/api/v1/admin/")) return true;
        if("OWNER".equals(role)) return true;
        if(!"EDITOR".equals(role)) return false;
        for(String denied:EDITOR_DENIED) if(path.startsWith(denied)) return false;
        for(String pattern:EDITOR_DENIED_PATTERNS) if(path.matches(pattern)) return false;
        return true;
    }
}