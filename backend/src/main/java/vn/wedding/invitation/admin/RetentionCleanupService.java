package vn.wedding.invitation.admin;

import java.time.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Removes only temporary import/export artifacts; business records are never part of this job. */
@Service
public class RetentionCleanupService {
    private final JdbcTemplate db;
    private final int importDays;
    private final int exportDays;
    public RetentionCleanupService(JdbcTemplate db,
        @Value("${app.cleanup.import-preview-retention-days:7}") int importDays,
        @Value("${app.cleanup.export-retention-days:2}") int exportDays) {
        if(importDays<1||importDays>30) throw new IllegalArgumentException("IMPORT_PREVIEW_RETENTION_DAYS must be between 1 and 30");
        if(exportDays<1||exportDays>30) throw new IllegalArgumentException("EXPORT_RETENTION_DAYS must be between 1 and 30");
        this.db=db;this.importDays=importDays;this.exportDays=exportDays;
    }
    public record CleanupResult(int importsDeleted,int exportsExpired,int exportsDeleted){}
    @Scheduled(fixedDelayString="${app.cleanup.interval-ms:3600000}",initialDelayString="${app.cleanup.initial-delay-ms:60000}")
    @Transactional
    public void scheduledCleanup(){cleanup(Instant.now());}
    @Transactional
    public CleanupResult cleanup(Instant now){
        int expired=db.update("UPDATE export_jobs SET status='EXPIRED' WHERE status='READY' AND expires_at<=?",java.sql.Timestamp.from(now));
        Instant importCutoff=now.minus(Duration.ofDays(importDays));
        int imports=db.update("DELETE FROM import_batches WHERE status IN ('PREVIEW','FAILED') AND created_at<?",java.sql.Timestamp.from(importCutoff));
        Instant exportCutoff=now.minus(Duration.ofDays(exportDays));
        int exports=db.update("DELETE FROM export_jobs WHERE status IN ('EXPIRED','REVOKED') AND COALESCE(revoked_at,expires_at)<?",java.sql.Timestamp.from(exportCutoff));
        return new CleanupResult(imports,expired,exports);
    }
    public static boolean deletableImport(String status,Instant createdAt,Instant now,int days){return ("PREVIEW".equals(status)||"FAILED".equals(status))&&createdAt.isBefore(now.minus(Duration.ofDays(days)));}
    public static boolean deletableExport(String status,Instant expiresAt,Instant revokedAt,Instant now,int days){return ("EXPIRED".equals(status)||"REVOKED".equals(status))&&(revokedAt==null?expiresAt:revokedAt).isBefore(now.minus(Duration.ofDays(days)));}
}