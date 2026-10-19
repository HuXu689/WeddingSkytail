package vn.wedding.invitation.admin;

import java.nio.charset.StandardCharsets;
import java.io.*;
import java.time.*;
import java.util.*;
import com.google.zxing.*;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.pdmodel.PDPageContentStream.AppendMode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.wedding.invitation.common.ApiErrors;
import vn.wedding.invitation.invitations.TokenService;
import static vn.wedding.invitation.access.AccessGate.number;

@Service
public class ExportService {
    private final JdbcTemplate db; private final TokenService tokens; private final String origin;
    public ExportService(JdbcTemplate db,TokenService tokens,@Value("${app.origin}") String origin){this.db=db;this.tokens=tokens;this.origin=origin.replaceAll("/$","");}
    /** labelStyle is optional so the previous two-field body keeps working; it only changes the A4 label layout (docs/02 §14). */
    public record Create(String format,List<UUID> invitationIds,String labelStyle){}
    public record Preview(UUID id,String format,String labelStyle,int rowCount,int pageCount,Instant expiresAt,List<Map<String,Object>> rows){}
    public static final Set<String> LABEL_STYLES=Set.of("QR_ONLY","NAME_QR");
    /** QR_ONLY prints only the code (for a wax seal); NAME_QR keeps the current name + event layout. */
    public static String labelStyle(String requested){return requested==null||requested.isBlank()?"NAME_QR":requested;}
    public record PdfRow(int rowNumber,String displayName,String qrUrl,String eventSummary){}
    @Transactional
    public Preview create(Create input){
        ApiErrors.require(input!=null&&Set.of("CSV","PDF").contains(input.format()),"Định dạng xuất không hợp lệ.");String labelStyle=labelStyle(input.labelStyle());ApiErrors.require(LABEL_STYLES.contains(labelStyle),"Mẫu nhãn in không hợp lệ.");ApiErrors.require(input.invitationIds()!=null&&!input.invitationIds().isEmpty()&&input.invitationIds().size()<=300,"Chọn từ 1 đến 300 khách.");
        UUID job=UUID.randomUUID();Instant expiry=Instant.now().plus(Duration.ofMinutes(30));int pages=(input.invitationIds().size()+14)/15;db.update("INSERT INTO export_jobs(id,format,status,row_count,page_count,expires_at,label_style) VALUES(?,?,?, ?,?,?,?)",job,input.format(),"READY",input.invitationIds().size(),pages,java.sql.Timestamp.from(expiry),labelStyle);List<Map<String,Object>> rows=new ArrayList<>();int n=0;
        for(UUID invitationId:input.invitationIds()){
            var invitation=db.queryForList("SELECT id,display_name,token_cipher FROM invitations WHERE id=? AND active=true AND archived=false",invitationId);ApiErrors.require(!invitation.isEmpty(),"Một khách đã bị lưu trữ hoặc thu hồi link. Hãy tải lại danh sách.");var item=invitation.getFirst();String token=tokens.decrypt((String)item.get("token_cipher"),invitationId),tokenHash=TokenService.hash(token),url=origin+"/i/"+token;var events=db.queryForList("SELECT e.title,e.start_at,e.venue FROM assignments a JOIN events e ON e.id=a.event_id WHERE a.invitation_id=? AND e.state<>'CANCELLED' ORDER BY e.start_at",invitationId);ApiErrors.require(!events.isEmpty(),"Một khách không còn buổi tiệc hợp lệ.");String summary=events.stream().map(e->e.get("title").toString()).reduce((a,b)->a+"; "+b).orElse("");n++;db.update("INSERT INTO export_rows(job_id,row_number,invitation_id,display_name,qr_url,token_hash,event_summary) VALUES(?,?,?,?,?,?,?)",job,n,invitationId,item.get("display_name"),url,tokenHash,summary);rows.add(Map.of("rowNumber",n,"invitationId",invitationId,"displayName",item.get("display_name"),"qrUrl",url,"eventSummary",summary));
        }
        db.update("INSERT INTO audit(action,target) VALUES('EXPORT_CREATE',?)",job);return new Preview(job,input.format(),labelStyle,n,pages,expiry,rows);
    }
    public Preview preview(UUID id){var job=validJob(id);List<Map<String,Object>> rows=db.queryForList("SELECT row_number rowNumber,invitation_id invitationId,display_name displayName,qr_url qrUrl,event_summary eventSummary FROM export_rows WHERE job_id=? ORDER BY row_number",id);return new Preview(id,(String)job.get("format"),(String)job.get("label_style"),(int)number(job,"row_count"),(int)number(job,"page_count"),((java.sql.Timestamp)job.get("expires_at")).toInstant(),rows);}
    public ResponseEntity<byte[]> download(UUID id){var job=validJob(id);var rows=db.queryForList("SELECT row_number,invitation_id,display_name,qr_url,token_hash,event_summary FROM export_rows WHERE job_id=? ORDER BY row_number",id);List<PdfRow> pdfRows=new ArrayList<>();StringBuilder csv=new StringBuilder("\uFEFFSTT,Tên người nhận,Link QR,Buổi được gán\n");for(var row:rows){var current=db.queryForList("SELECT token_cipher FROM invitations WHERE id=? AND active=true AND archived=false",row.get("invitation_id"));ApiErrors.require(!current.isEmpty()&&TokenService.hash(tokens.decrypt((String)current.getFirst().get("token_cipher"),(UUID)row.get("invitation_id"))).equals(row.get("token_hash")),"Link của một khách đã bị thu hồi hoặc thay đổi. Hãy tạo bản xuất mới.");var pdfRow=new PdfRow(((Number)row.get("row_number")).intValue(),(String)row.get("display_name"),(String)row.get("qr_url"),(String)row.get("event_summary"));pdfRows.add(pdfRow);csv.append(pdfRow.rowNumber()).append(',').append(csv(pdfRow.displayName())).append(',').append(csv(pdfRow.qrUrl())).append(',').append(csv(pdfRow.eventSummary())).append('\n');}byte[] body;MediaType type;String filename;if("PDF".equals(job.get("format"))){try{body=renderPdf(pdfRows,(String)job.get("label_style")); }catch(IOException e){throw new IllegalStateException("Không thể tạo PDF.",e);}type=MediaType.APPLICATION_PDF;filename="loi-moi-qr-"+id+".pdf";}else{body=csv.toString().getBytes(StandardCharsets.UTF_8);type=MediaType.parseMediaType("text/csv;charset=UTF-8");filename="loi-moi-qr-"+id+".csv";}return ResponseEntity.ok().contentType(type).header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\""+filename+"\"").cacheControl(CacheControl.noStore()).body(body);}
    public void revoke(UUID id){var job=validJob(id);db.update("UPDATE export_jobs SET status='REVOKED',revoked_at=now() WHERE id=?",id);db.update("INSERT INTO audit(action,target) VALUES('EXPORT_REVOKE',?)",id);}
    private Map<String,Object> validJob(UUID id){var job=db.queryForMap("SELECT * FROM export_jobs WHERE id=?",id);if(!"READY".equals(job.get("status"))||Instant.now().isAfter(((java.sql.Timestamp)job.get("expires_at")).toInstant())){db.update("UPDATE export_jobs SET status='EXPIRED' WHERE id=? AND status='READY'",id);throw ApiErrors.unavailable();}return job;}
    static String csv(Object value){String s=value==null?"":value.toString();if(s.startsWith("=")||s.startsWith("+")||s.startsWith("-")||s.startsWith("@"))s="'"+s;return '"'+s.replace("\"","\"\"")+'"';}
    private static String line(Object... values){StringBuilder out=new StringBuilder();for(int i=0;i<values.length;i++){if(i>0)out.append(',');out.append(csv(values[i]));}return out.append('\n').toString();}
    private static String yesNo(Object value,String yes,String no){return Boolean.TRUE.equals(value)?yes:no;}
    private static String stamp(){return java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd-HHmm").withZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).format(Instant.now());}
    private static ResponseEntity<byte[]> csvDownload(String body,String name){byte[] bytes=("\uFEFF"+body).getBytes(StandardCharsets.UTF_8);return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/csv;charset=UTF-8")).header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\""+name+".csv\"").cacheControl(CacheControl.noStore()).body(bytes);}
    /** Guest report by event or for the whole list. Deliberately free of links, tokens and phone numbers (FR09, docs/02 §15). */
    public ResponseEntity<byte[]> guestReport(UUID eventId){
        var csv=new StringBuilder("Người nhận,Nhóm,Xưng hô");
        if(eventId==null){
            csv.append(",Bên được mời,Mã tham chiếu,Trạng thái link,Lưu trữ,Ghi chú nội bộ\n");
            var rows=db.queryForList("SELECT i.display_name,i.group_name,i.salutation,(SELECT string_agg(e.title,' · ' ORDER BY e.start_at) FROM assignments a JOIN events e ON e.id=a.event_id WHERE a.invitation_id=i.id AND e.state<>'CANCELLED') buoi,i.external_ref,i.active,i.archived,i.internal_note FROM invitations i ORDER BY i.display_name,i.id");
            for(var r:rows) csv.append(line(r.get("display_name"),r.get("group_name"),r.get("salutation"),r.get("buoi"),r.get("external_ref"),yesNo(r.get("active"),"Đang hiệu lực","Đã thu hồi"),yesNo(r.get("archived"),"Đã lưu trữ","Đang dùng"),r.get("internal_note")));
        } else {
            csv.append(",Buổi tiệc,Số người tối đa,Phản hồi,Số người xác nhận,Lời nhắn,Cập nhật lúc,Trạng thái link\n");
            var rows=db.queryForList("SELECT i.display_name,i.group_name,i.salutation,e.title buoi,a.max_people,r.status,r.total_people,r.note,r.updated_at,i.active FROM invitations i JOIN assignments a ON a.invitation_id=i.id JOIN events e ON e.id=a.event_id LEFT JOIN responses r ON r.invitation_id=i.id AND r.event_id=a.event_id WHERE a.event_id=? ORDER BY i.display_name,i.id",eventId);
            for(var r:rows) csv.append(line(r.get("display_name"),r.get("group_name"),r.get("salutation"),r.get("buoi"),r.get("max_people"),r.get("status")==null?"Chưa phản hồi":"ATTENDING".equals(r.get("status"))?"Sẽ tham dự":"Không thể tham dự",r.get("total_people"),r.get("note"),r.get("updated_at"),yesNo(r.get("active"),"Đang hiệu lực","Đã thu hồi")));
        }
        return csvDownload(csv.toString(),"bao-cao-khach-"+stamp());
    }
    /** RSVP report; owner notes stay private because the file is only returned to an authenticated owner (FR09). */
    public ResponseEntity<byte[]> responseReport(UUID eventId){
        var csv=new StringBuilder("Người nhận,Nhóm,Buổi tiệc,Phản hồi,Số người,Lời nhắn,Cập nhật lúc\n");
        var rows=eventId==null
            ?db.queryForList("SELECT i.display_name,i.group_name,e.title buoi,r.status,r.total_people,r.note,r.updated_at FROM responses r JOIN invitations i ON i.id=r.invitation_id JOIN events e ON e.id=r.event_id ORDER BY e.start_at,i.display_name,i.id")
            :db.queryForList("SELECT i.display_name,i.group_name,e.title buoi,r.status,r.total_people,r.note,r.updated_at FROM responses r JOIN invitations i ON i.id=r.invitation_id JOIN events e ON e.id=r.event_id WHERE e.id=? ORDER BY i.display_name,i.id",eventId);
        for(var r:rows) csv.append(line(r.get("display_name"),r.get("group_name"),r.get("buoi"),"ATTENDING".equals(r.get("status"))?"Sẽ tham dự":"Không thể tham dự",r.get("total_people"),r.get("note"),r.get("updated_at")));
        return csvDownload(csv.toString(),"bao-cao-phan-hoi-"+stamp());
    }
    /** Keeps the current 15-labels-per-page layout for existing callers and tests. */
    public static byte[] renderPdf(List<PdfRow> rows) throws IOException { return renderPdf(rows,"NAME_QR"); }
    public static byte[] renderPdf(List<PdfRow> rows,String labelStyle) throws IOException {
        boolean qrOnly="QR_ONLY".equals(labelStyle);
        try(InputStream fontStream=ExportService.class.getResourceAsStream("/fonts/NotoSans-Regular.ttf")){if(fontStream==null)throw new FileNotFoundException("NotoSans-Regular.ttf");try(PDDocument doc=new PDDocument();ByteArrayOutputStream out=new ByteArrayOutputStream()){PDType0Font font=PDType0Font.load(doc,fontStream);PDRectangle a4=PDRectangle.A4;float margin=24, gap=8, cellW=(a4.getWidth()-2*margin-2*gap)/3, cellH=(a4.getHeight()-2*margin-4*gap)/5;for(int pageIndex=0;pageIndex<rows.size();pageIndex+=15){PDPage page=new PDPage(a4);doc.addPage(page);try(PDPageContentStream stream=new PDPageContentStream(doc,page,AppendMode.APPEND,false,true)){for(int offset=0;offset<Math.min(15,rows.size()-pageIndex);offset++){PdfRow row=rows.get(pageIndex+offset);int col=offset%3, line=offset/3;float x=margin+col*(cellW+gap),y=a4.getHeight()-margin-(line+1)*cellH-line*gap;stream.setStrokingColor(0.78f,0.78f,0.78f);stream.addRect(x,y,cellW,cellH);stream.stroke();byte[] qr=qr(row.qrUrl());PDImageXObject image=PDImageXObject.createFromByteArray(doc,qr,"qr");if(qrOnly){float size=Math.min(cellW-40,cellH-44);stream.drawImage(image,x+(cellW-size)/2,y+(cellH-size)/2+8,size,size);stream.beginText();stream.setFont(font,7);stream.setNonStrokingColor(0.35f,0.35f,0.35f);stream.newLineAtOffset(x+8,y+14);showWrapped(stream,font,"Mã "+row.rowNumber(),7,cellW-16,1);stream.endText();}else{stream.beginText();stream.setFont(font,10);stream.setNonStrokingColor(0.12f,0.12f,0.12f);stream.newLineAtOffset(x+8,y+cellH-20);showWrapped(stream,font,row.displayName(),10,cellW-112,2);stream.endText();stream.drawImage(image,x+cellW-96,y+cellH-104,88,88);stream.beginText();stream.setFont(font,7);stream.newLineAtOffset(x+8,y+cellH-54);showWrapped(stream,font,"Mã "+row.rowNumber(),7,cellW-16,1);stream.endText();stream.beginText();stream.setFont(font,7);stream.newLineAtOffset(x+8,y+18);showWrapped(stream,font,row.eventSummary(),7,cellW-16,2);stream.endText();}}}}doc.save(out);return out.toByteArray();}}
    }
    private static byte[] qr(String url) throws IOException {try{var matrix=new QRCodeWriter().encode(url,BarcodeFormat.QR_CODE,480,480,Map.of(EncodeHintType.MARGIN,3));var out=new ByteArrayOutputStream();MatrixToImageWriter.writeToStream(matrix,"PNG",out);return out.toByteArray();}catch(Exception e){throw new IOException("Không tạo được QR.",e);}}
    private static void showWrapped(PDPageContentStream stream,PDType0Font font,String value,float size,float width,int maxLines) throws IOException {String text=value==null?"":value.replaceAll("[\\r\\n]+"," ").strip();StringBuilder line=new StringBuilder();int lines=0;for(String word:text.split("\\s+")){String candidate=line.length()==0?word:line+" "+word;if(font.getStringWidth(candidate)*size/1000f<=width){line.setLength(0);line.append(candidate);}else{if(line.length()>0){stream.showText(line.toString());stream.newLineAtOffset(0,-(size+2));lines++;}line.setLength(0);line.append(word);if(lines>=maxLines-1)break;}}if(line.length()>0&&lines<maxLines)stream.showText(line.toString());}
}