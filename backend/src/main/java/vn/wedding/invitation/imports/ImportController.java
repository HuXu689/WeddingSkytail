package vn.wedding.invitation.imports;

import java.util.*;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/v1/admin/imports")
public class ImportController {
    private final ImportService imports;
    public ImportController(ImportService imports){this.imports=imports;}
    @PostMapping(value="/preview",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    Object preview(@RequestPart("file") MultipartFile file,@RequestHeader("Idempotency-Key") UUID key){return imports.preview(file,key);}
    public record Commit(@NotNull UUID batchId,@NotNull UUID idempotencyKey){}
    @PostMapping("/commit") Object commit(@RequestBody Commit input){return imports.commit(input.batchId(),input.idempotencyKey());}
    @GetMapping("/{id}") Object get(@PathVariable UUID id){return imports.loadPreview(id);}
    @GetMapping(value="/template.csv",produces="text/csv;charset=UTF-8") String template(){return "externalRef,displayName,salutation,groupName,eventCodes,maxPeople\nKH-001,Gia đình cô Hoa,Kính mời,Gia đình,E-ABC12345,3\n";}
}