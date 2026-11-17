package vn.wedding.invitation;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.json.JsonMapper;
import vn.wedding.invitation.wedding.SectionService;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class SectionPrivacyTest {
 private static final JsonMapper JSON=JsonMapper.builder().build();
 private static final String PUBLIC_SQL="SELECT kind,audience,enabled,title,body,starts_at AS \"startsAt\",color,payload::text AS payload FROM wedding_sections WHERE surface=? AND enabled=true AND audience='PUBLIC' ORDER BY position";
 private static final String GUEST_SQL="SELECT kind,audience,enabled,title,body,starts_at AS \"startsAt\",color,payload::text AS payload FROM wedding_sections WHERE surface=? AND enabled=true ORDER BY position";
 static Map<String,Object> map(Object... entries){
  var result=new LinkedHashMap<String,Object>();
  for(int i=0;i+1<entries.length;i+=2) result.put((String)entries[i],entries[i+1]);
  return result;
 }
 static Map<String,Object> timelineRow(Object payload){
  var row=new HashMap<String,Object>();
  row.put("kind","TIMELINE");row.put("audience","PUBLIC");row.put("enabled",true);row.put("title","Mốc lịch trình");
  row.put("body","");row.put("startsAt",null);row.put("color",null);
  row.put("payload",payload instanceof String text?text:JSON.writeValueAsString(payload));
  return row;
 }
 static Map<String,Object> milestones(String publicTitle,String privateTitle){
  return map("timeline",List.of(map("at","2026-12-24T01:23:00Z","title",publicTitle,"audience","PUBLIC"),map("at","2026-12-24T02:00:00Z","title",privateTitle,"audience","PRIVATE")));
 }
 @Test void publicQueryNeverIncludesPrivateOrDisabledSections(){var db=mock(JdbcTemplate.class);new SectionService(db).list(false,false);verify(db).queryForList(PUBLIC_SQL,"PUBLISHED");}
 @Test void privateQueryStillRequiresPublishedEnabledContent(){var db=mock(JdbcTemplate.class);new SectionService(db).list(false,true);verify(db).queryForList(GUEST_SQL,"PUBLISHED");}
 @Test void staleSaveCannotDeleteDraft(){var db=mock(JdbcTemplate.class);when(db.queryForMap("SELECT * FROM wedding WHERE id=1 FOR UPDATE")).thenReturn(Map.of("version",5L));assertThrows(RuntimeException.class,()->new SectionService(db).save(new SectionService.Input(List.of(),1,2,4)));verify(db).queryForMap("SELECT * FROM wedding WHERE id=1 FOR UPDATE");verifyNoMoreInteractions(db);}
 /** Mốc lịch trình riêng bị lọc ngay ở server, không chỉ ẩn bằng giao diện. */
 @Test void publicPayloadDropsPrivateMilestonesAtServer(){
  var db=mock(JdbcTemplate.class);
  when(db.queryForList(anyString(),eq("PUBLISHED"))).thenReturn(List.of(timelineRow(milestones("Đón khách","Lễ gia tiên"))));
  var rows=SectionService.list(db,false,false);
  assertEquals(1,rows.size());
  var payload=(Map<?,?>)rows.getFirst().get("payload");
  var timeline=(List<?>)payload.get("timeline");
  assertEquals(1,timeline.size());
  assertEquals("Đón khách",((Map<?,?>)timeline.get(0)).get("title"));
  assertNull(rows.getFirst().get("startsAt"),"starts_at cũ không được rò mốc riêng ra bản công khai");
 }
 @Test void publicSectionDisappearsWhenEveryMilestoneIsPrivate(){
  var db=mock(JdbcTemplate.class);
  when(db.queryForList(anyString(),eq("PUBLISHED"))).thenReturn(List.of(timelineRow(map("timeline",List.of(map("at","2026-12-24T02:00:00Z","title","Lễ gia tiên","audience","PRIVATE"))))));
  assertEquals(0,SectionService.list(db,false,false).size());
 }
 @Test void guestViewKeepsPrivateMilestones(){
  var db=mock(JdbcTemplate.class);
  when(db.queryForList(anyString(),eq("PUBLISHED"))).thenReturn(List.of(timelineRow(milestones("Đón khách","Lễ gia tiên"))));
  var rows=SectionService.list(db,false,true);
  assertEquals(1,rows.size());
  assertEquals(2,((List<?>)((Map<?,?>)rows.getFirst().get("payload")).get("timeline")).size());
 }
 @Test void malformedPayloadIsDroppedNotEchoed(){
  var db=mock(JdbcTemplate.class);
  when(db.queryForList(anyString(),eq("PUBLISHED"))).thenReturn(List.of(timelineRow("không-phải-json")));
  var rows=SectionService.list(db,false,false);
  assertEquals(1,rows.size());
  assertNull(rows.getFirst().get("payload"));
 }
 @Test void publishedIntroRewritesAdminMediaPathsToPublicMediaUrls(){
  var db=mock(JdbcTemplate.class);
  String uuid="9b927137-c773-4109-8adf-583350322917";
  var introRow=new HashMap<String,Object>();
  introRow.put("kind","INTRO");introRow.put("audience","PUBLIC");introRow.put("enabled",true);
  introRow.put("title","Giới thiệu");introRow.put("body","");introRow.put("startsAt",null);introRow.put("color",null);
  introRow.put("payload",JSON.writeValueAsString(map(
   "people",List.of(map("name","An","avatarUrl","/api/v1/admin/media/"+uuid+"/content")),
   "milestones",List.of(map("dateLabel","2022","title","Gặp gỡ","photoUrl","/api/v1/admin/media/"+uuid+"/thumb"))
  )));
  when(db.queryForList(anyString(),eq("PUBLISHED"))).thenReturn(List.of(introRow));
  var rows=SectionService.list(db,false,false);
  var payload=(Map<?,?>)rows.getFirst().get("payload");
  var firstPerson=(Map<?,?>)((List<?>)payload.get("people")).get(0);
  var firstMilestone=(Map<?,?>)((List<?>)payload.get("milestones")).get(0);
  assertEquals("/media/"+uuid+".jpg",firstPerson.get("avatarUrl"));
  assertEquals("/media/"+uuid+".jpg",firstMilestone.get("photoUrl"));
 }
}