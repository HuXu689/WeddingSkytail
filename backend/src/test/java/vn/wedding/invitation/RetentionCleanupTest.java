package vn.wedding.invitation;

import java.time.*;
import org.junit.jupiter.api.Test;
import vn.wedding.invitation.admin.RetentionCleanupService;
import static org.junit.jupiter.api.Assertions.*;

class RetentionCleanupTest {
    private final Instant now=Instant.parse("2027-01-10T00:00:00Z");
    @Test void importCleanupOnlyRemovesTemporaryOldRows(){
        assertTrue(RetentionCleanupService.deletableImport("PREVIEW",now.minus(Duration.ofDays(8)),now,7));
        assertTrue(RetentionCleanupService.deletableImport("FAILED",now.minus(Duration.ofDays(8)),now,7));
        assertFalse(RetentionCleanupService.deletableImport("COMMITTED",now.minus(Duration.ofDays(8)),now,7));
        assertFalse(RetentionCleanupService.deletableImport("PREVIEW",now.minus(Duration.ofDays(6)),now,7));
    }
    @Test void exportCleanupKeepsReadyAndRecentArtifacts(){
        assertTrue(RetentionCleanupService.deletableExport("EXPIRED",now.minus(Duration.ofDays(3)),null,now,2));
        assertTrue(RetentionCleanupService.deletableExport("REVOKED",now.minus(Duration.ofDays(1)),now.minus(Duration.ofDays(3)),now,2));
        assertFalse(RetentionCleanupService.deletableExport("READY",now.minus(Duration.ofDays(3)),null,now,2));
        assertFalse(RetentionCleanupService.deletableExport("EXPIRED",now.minus(Duration.ofDays(1)),null,now,2));
    }
}