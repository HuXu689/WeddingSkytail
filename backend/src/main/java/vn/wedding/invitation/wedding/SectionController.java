package vn.wedding.invitation.wedding;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/wedding/sections")
public class SectionController {
    private final SectionService service;
    public SectionController(SectionService service){this.service=service;}
    @GetMapping Object list(){return service.list(true,true);}
    @PutMapping void save(@RequestBody SectionService.Input input){service.save(input);}
}