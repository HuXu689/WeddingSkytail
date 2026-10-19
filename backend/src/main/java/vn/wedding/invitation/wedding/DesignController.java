package vn.wedding.invitation.wedding;

import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.wedding.invitation.common.ApiErrors;
import vn.wedding.invitation.media.MediaService;
import static vn.wedding.invitation.access.AccessGate.number;

@RestController
@RequestMapping("/api/v1/admin/wedding")
public class DesignController {
    private final JdbcTemplate db;
    private final MediaService media;
    public DesignController(JdbcTemplate db,MediaService media) { this.db=db; this.media=media; }
    public record DesignInput(
        @NotBlank @Size(max=200) String names,
        @NotNull @Size(max=2000) String message,
        @NotNull @Pattern(regexp="ELEGANT|TRADITIONAL|MODERN") String theme,
        @NotNull @Pattern(regexp="OLIVE|BURGUNDY|NAVY") String accent,
        @NotNull @Size(max=4000) String story,
        @NotNull @Size(max=500) String footer,
        boolean showStory, UUID musicId, Boolean showCountdown, long expectedVersion) {}
    @PutMapping("/design")
    @Transactional
    public void save(@Valid @RequestBody DesignInput input) {
        var row=db.queryForMap("SELECT * FROM wedding WHERE id=1 FOR UPDATE");
        ApiErrors.version(number(row,"version"),input.expectedVersion());
        if(input.musicId()!=null) media.requireAudio(input.musicId());
        db.update("UPDATE wedding SET draft_names=?,draft_message=?,draft_theme=?,draft_accent=?,draft_story=?,draft_footer=?,draft_show_story=?,draft_music_id=?,draft_show_countdown=?,version=version+1 WHERE id=1",
            input.names(),input.message(),input.theme(),input.accent(),input.story(),input.footer(),input.showStory(),input.musicId(),Boolean.TRUE.equals(input.showCountdown()));
        db.update("INSERT INTO audit(action,target) VALUES('WEDDING_DESIGN','1')");
    }
}