package vn.wedding.invitation.admin;

import java.util.*;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.google.zxing.*;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import java.io.ByteArrayOutputStream;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
    private final AdminService service;
    private final GuestManagementService guests;
    private final ResponseManagementService responseManager;
    private final ExportService exports;
    private final String origin;
    public AdminController(AdminService service,GuestManagementService guests,ResponseManagementService responseManager,ExportService exports,@Value("${app.origin}") String origin) { this.service=service; this.guests=guests; this.responseManager=responseManager; this.exports=exports; this.origin=origin.replaceAll("/$",""); }
    public record Version(long expectedVersion) {}
    @GetMapping("/wedding") Object wedding() { return service.wedding(); }
    @PutMapping("/wedding/draft") void wedding(@Valid @RequestBody AdminService.WeddingInput input) { service.saveWedding(input); }
    @PostMapping("/wedding/{action:publish|unpublish}") void publish(@PathVariable String action,@RequestBody Version version) { service.publishWedding(action.equals("publish"),version.expectedVersion()); }
    @GetMapping("/events") Object events() { return service.events(); }
    @PostMapping("/events") Object event(@Valid @RequestBody AdminService.EventInput input) { return Map.of("id",service.saveEvent(null,input)); }
    @PutMapping("/events/{id}/draft") void event(@PathVariable UUID id,@Valid @RequestBody AdminService.EventInput input) { service.saveEvent(id,input); }
    @PostMapping("/events/{id}/{action:publish|cancel}") void state(@PathVariable UUID id,@PathVariable String action,@RequestBody Version version) { service.eventState(id,action.equals("publish")?"PUBLISHED":"CANCELLED",version.expectedVersion()); }
    @PostMapping("/guests") Object guest(@Valid @RequestBody AdminService.GuestInput input) { return Map.of("id",service.createGuest(input)); }
    @GetMapping("/invitations") Object invitations(@RequestParam(defaultValue="0") int page,@RequestParam(required=false) String query,@RequestParam(required=false) Boolean archived,@RequestParam(required=false) UUID eventId,@RequestParam(required=false) String responseStatus) { return guests.list(page,query,archived,eventId,responseStatus); }
    @PutMapping("/invitations/{id}") Object updateGuest(@PathVariable UUID id,@Valid @RequestBody GuestManagementService.Update input) { return guests.update(id,input); }
    @PostMapping("/invitations/{id}/{action:archive|restore}") void archive(@PathVariable UUID id,@PathVariable String action,@RequestBody Version version) { guests.archive(id,action.equals("archive"),version.expectedVersion()); }
    @PutMapping("/access-policy") void policy(@Valid @RequestBody AdminService.PolicyInput input) { service.policy(null,input); }
    @PutMapping("/invitations/{id}/access-policy") void policy(@PathVariable UUID id,@Valid @RequestBody AdminService.PolicyInput input) { service.policy(id,input); }
    @PostMapping("/invitations/{id}/link-reveal") Object reveal(@PathVariable UUID id) { return Map.of("url",origin+"/i/"+service.reveal(id)); }
    @PostMapping("/invitations/{id}/{action:sent|revoke|rotate}") void action(@PathVariable UUID id,@PathVariable String action,@RequestBody Version version) { service.action(id,action,version.expectedVersion()); }
    @GetMapping(value="/invitations/{id}/qr.png",produces="image/png") byte[] qr(@PathVariable UUID id) throws Exception {
        String url=origin+"/i/"+service.reveal(id); var matrix=new QRCodeWriter().encode(url,BarcodeFormat.QR_CODE,600,600,Map.of(EncodeHintType.MARGIN,4));
        var out=new ByteArrayOutputStream(); MatrixToImageWriter.writeToStream(matrix,"PNG",out); return out.toByteArray();
    }
    @GetMapping("/dashboard") Object dashboard() { return service.dashboard(); }
    @GetMapping("/responses") Object responses(@RequestParam(defaultValue="0") int page,@RequestParam(required=false) String query,@RequestParam(required=false) String status,@RequestParam(required=false) UUID eventId) { return responseManager.list(page,query,status,eventId); }
    @GetMapping("/responses/{invitationId}/{eventId}/history") Object responseHistory(@PathVariable UUID invitationId,@PathVariable UUID eventId) { return responseManager.history(invitationId,eventId); }
    @PutMapping("/responses/{invitationId}/{eventId}") Object updateResponse(@PathVariable UUID invitationId,@PathVariable UUID eventId,@Valid @RequestBody ResponseManagementService.Update input) { return responseManager.update(invitationId,eventId,input); }
    @GetMapping("/audit") Object audit() { return service.audit(); }
    @PostMapping("/exports") Object createExport(@RequestBody ExportService.Create input) { return exports.create(input); }
    @GetMapping("/exports/{id}") Object exportPreview(@PathVariable UUID id) { return exports.preview(id); }
    @GetMapping("/exports/{id}/download") ResponseEntity<byte[]> downloadExport(@PathVariable UUID id) { return exports.download(id); }
    @PostMapping("/exports/{id}/revoke") void revokeExport(@PathVariable UUID id) { exports.revoke(id); }
}