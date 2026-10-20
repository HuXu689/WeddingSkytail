package vn.wedding.invitation.wedding;

import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/events")
public class EventLocationController {
    private final EventLocationService locations;
    public EventLocationController(EventLocationService locations){this.locations=locations;}
    @PutMapping("/{id}/location")
    Object save(@PathVariable UUID id,@RequestBody EventLocationService.Input input){return locations.save(id,input);}
}