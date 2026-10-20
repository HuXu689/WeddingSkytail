package vn.wedding.invitation.identity;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/** T25: the role matrix decides access, so it is tested directly instead of only through HTTP. */
class AdminPermissionsTest {
    @Test void ownerKeepsEveryAdminRight() {
        assertTrue(AdminPermissions.allows("OWNER","/api/v1/admin/users"));
        assertTrue(AdminPermissions.allows("OWNER","/api/v1/admin/invitations/1/pin"));
        assertTrue(AdminPermissions.allows("OWNER","/api/v1/admin/exports"));
        assertTrue(AdminPermissions.allows("OWNER","/api/v1/admin/audit"));
        assertTrue(AdminPermissions.known("OWNER"));
    }
    @Test void editorKeepsContentGuestAndRsvpWork() {
        for(String path:new String[]{"/api/v1/admin/wedding","/api/v1/admin/wedding/design","/api/v1/admin/media",
            "/api/v1/admin/media/hero/DRAFT","/api/v1/admin/media/audio","/api/v1/admin/events","/api/v1/admin/events/1/revise",
            "/api/v1/admin/guests","/api/v1/admin/invitations","/api/v1/admin/invitations/1","/api/v1/admin/invitations/1/sent",
            "/api/v1/admin/invitations/1/archive","/api/v1/admin/responses/1/1","/api/v1/admin/reminders",
            "/api/v1/admin/reminders/1/2","/api/v1/admin/wishes","/api/v1/admin/dashboard","/api/v1/admin/imports/preview"})
            assertTrue(AdminPermissions.allows("EDITOR",path),path);
    }
    @Test void editorNeverReachesSecretsPublishingExportsOrPeople() {
        for(String path:new String[]{"/api/v1/admin/users","/api/v1/admin/users/em","/api/v1/admin/audit",
            "/api/v1/admin/access-policy","/api/v1/admin/invitations/1/access-policy","/api/v1/admin/invitations/bulk-policy",
            "/api/v1/admin/invitations/1/pin","/api/v1/admin/invitations/1/pin/reset","/api/v1/admin/invitations/1/link-reveal",
            "/api/v1/admin/invitations/1/revoke","/api/v1/admin/invitations/1/rotate","/api/v1/admin/exports",
            "/api/v1/admin/exports/1/download","/api/v1/admin/reports/guests.csv","/api/v1/admin/imports/commit",
            "/api/v1/admin/wedding/publish","/api/v1/admin/wedding/unpublish","/api/v1/admin/wedding/tracking",
            "/api/v1/admin/events/1/publish","/api/v1/admin/events/1/cancel"})
            assertFalse(AdminPermissions.allows("EDITOR",path),path);
    }
    @Test void unknownRolesAndNonAdminPaths() {
        assertTrue(AdminPermissions.allows("EDITOR","/api/v1/auth/password"));
        assertTrue(AdminPermissions.allows("OWNER","/api/v1/guest/invitations/1"));
        assertFalse(AdminPermissions.allows(null,"/api/v1/admin/wedding"));
        assertFalse(AdminPermissions.allows("GUEST","/api/v1/admin/wedding"));
        assertFalse(AdminPermissions.allows("","/api/v1/admin/wedding"));
        assertFalse(AdminPermissions.known("guest"));
        assertFalse(AdminPermissions.known(null));
    }
    @Test void giftConfigurationAndAssetsAreOwnerOnly(){
        for(String path:new String[]{"/api/v1/admin/gifts","/api/v1/admin/gifts/draft","/api/v1/admin/gifts/publish","/api/v1/admin/gifts/assets/fixture"}){
            assertTrue(AdminPermissions.allows("OWNER",path));
            assertFalse(AdminPermissions.allows("EDITOR",path));
            assertFalse(AdminPermissions.allows(null,path));
        }
    }
}