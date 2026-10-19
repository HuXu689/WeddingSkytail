package vn.wedding.invitation.wedding;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/wedding/layout")
public class LayoutController {
    private final LayoutService service;
    private final JdbcTemplate db;
    public LayoutController(LayoutService service,JdbcTemplate db){this.service=service;this.db=db;}
    @GetMapping Object list(){return LayoutService.list(db,true);}
    @PutMapping void save(@RequestBody LayoutService.Input input){service.save(input);}
}