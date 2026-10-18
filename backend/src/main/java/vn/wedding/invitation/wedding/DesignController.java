package vn.wedding.invitation.wedding;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.wedding.invitation.common.ApiErrors;
import static vn.wedding.invitation.access.AccessGate.number;

@RestController
@RequestMapping("/api/v1/admin/wedding")
public class DesignController {
    private final JdbcTemplate db;
    public DesignController(JdbcTemplate db) { this.db=db; }
    public record DesignInput(
        @NotBlank @Size(max=200) String names,
        @NotNull @Size(max=2000) String message,
        @NotNull @Pattern(regexp="ELEGANT|TRADITIONAL|MODERN") String theme,
        @NotNull @Pattern(regexp="OLIVE|BURGUNDY|NAVY") String accent,
        @NotNull @Size(max=4000) String story,
        @NotNull @Size(max=500) String footer,
        boolean showStory, long expectedVersion) {}
    @PutMapping("/design")
    @Transactional
    public void save(@Valid @RequestBody DesignInput input) {
        var row=db.queryForMap("SELECT * FROM wedding WHERE id=1 FOR UPDATE");
        ApiErrors.version(number(row,"version"),input.expectedVersion());
        db.update("UPDATE wedding SET draft_names=?,draft_message=?,draft_theme=?,draft_accent=?,draft_story=?,draft_footer=?,draft_show_story=?,version=version+1 WHERE id=1",
            input.names(),input.message(),input.theme(),input.accent(),input.story(),input.footer(),input.showStory());
        db.update("INSERT INTO audit(action,target) VALUES('WEDDING_DESIGN','1')");
    }
}