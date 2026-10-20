package vn.wedding.invitation;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.imageio.ImageIO;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import vn.wedding.invitation.invitations.TokenService;
import static org.junit.jupiter.api.Assertions.*;

/** Run only via scripts/features-persistence-qa.ps1 against its fresh, disposable PostgreSQL. */
@EnabledIfEnvironmentVariable(named="FEATURE_QA_DATABASE",matches="jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/feature_qa")
class FeaturePersistenceIntegrationTest {
    final String url=System.getenv("FEATURE_QA_DATABASE");
    final String password="Disposable-Fixture-Only-2026";
    final String tokenKey=Base64.getEncoder().encodeToString(new byte[32]);
    final ObjectMapper json=new ObjectMapper();
    final JdbcTemplate db=new JdbcTemplate(new DriverManagerDataSource(url,"feature_qa",password));
    ConfigurableApplicationContext context;
    String base;
    void start(){
        context=new SpringApplicationBuilder(WeddingApplication.class).run(
            "--server.address=127.0.0.1","--server.port=0","--spring.datasource.url="+url,
            "--spring.datasource.username=feature_qa","--spring.datasource.password="+password,
            "--app.admin-user=fixture-owner","--app.admin-password="+password,"--app.token-key="+tokenKey,
            "--app.media-root=target/feature-qa-media","--app.cleanup.initial-delay-ms=86400000");
        base="http://127.0.0.1:"+((WebServerApplicationContext)context).getWebServer().getPort();
    }
    final class Browser {
        final HttpClient client=HttpClient.newBuilder().cookieHandler(new CookieManager(null,CookiePolicy.ACCEPT_ALL)).followRedirects(HttpClient.Redirect.NEVER).build();
        String csrf;
        HttpResponse<byte[]> request(String method,String path,String body,boolean token) throws Exception {
            return send(method,path,body.getBytes(StandardCharsets.UTF_8),"application/json",token);
        }
        HttpResponse<byte[]> send(String method,String path,byte[] body,String type,boolean token) throws Exception {
            var builder=HttpRequest.newBuilder(URI.create(base+path)).timeout(java.time.Duration.ofSeconds(20));
            if(token)builder.header("X-CSRF-TOKEN",csrf);
            if(!method.equals("GET"))builder.header("Content-Type",type);
            return client.send(builder.method(method,HttpRequest.BodyPublishers.ofByteArray(body)).build(),HttpResponse.BodyHandlers.ofByteArray());
        }
        JsonNode body(HttpResponse<byte[]> response,int status){assertEquals(status,response.statusCode());return json.readTree(response.body());}
        void csrf() throws Exception {csrf=body(request("GET","/api/v1/session/csrf","",false),200).get("token").asString();}
        void login(String username) throws Exception {
            csrf();assertEquals(204,send("POST","/api/v1/auth/login",("username="+username+"&password="+password).getBytes(StandardCharsets.UTF_8),"application/x-www-form-urlencoded",true).statusCode());csrf();
        }
    }
    String input(String mode,String visibility,UUID first,UUID second,long revision){
        return "{\"enabled\":true,\"mode\":\""+mode+"\",\"visibility\":\""+visibility+"\",\"first\":{\"label\":\"Fixture A\",\"description\":\"\",\"assetId\":\""+first+"\"},\"second\":{\"label\":\"Fixture B\",\"description\":\"\",\"assetId\":\""+second+"\"},\"expectedRevision\":"+revision+"}";
    }
    String publish(long draft,long published,boolean confirmed){return "{\"expectedRevision\":"+draft+",\"expectedPublishedRevision\":"+published+",\"confirmed\":"+confirmed+"}";}
    UUID upload(Browser owner,byte[] png) throws Exception {
        String boundary="fixture-boundary";var out=new ByteArrayOutputStream();
        out.write(("--"+boundary+"\r\nContent-Disposition: form-data; name=\"file\"; filename=\"fixture.png\"\r\nContent-Type: image/png\r\n\r\n").getBytes(StandardCharsets.UTF_8));out.write(png);out.write(("\r\n--"+boundary+"--\r\n").getBytes(StandardCharsets.UTF_8));
        return UUID.fromString(owner.body(owner.send("POST","/api/v1/admin/gifts/assets",out.toByteArray(),"multipart/form-data; boundary="+boundary,true),200).get("id").asString());
    }
    @Test void upgradePersistenceAndRealHttpPermissions() throws Exception {
        // Refuse any database with application tables, rather than reset a caller-provided database.
        assertEquals(0,db.queryForObject("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'",Integer.class));
        Flyway.configure().dataSource(url,"feature_qa",password).target("23").load().migrate();
        UUID event=UUID.randomUUID(),other=UUID.randomUUID(),invitation=UUID.randomUUID();
        for(UUID id:List.of(event,other))db.update("INSERT INTO events(id,event_code,title,start_at,deadline,venue,address,timezone,capacity,state) VALUES(?,?,'QA fixture','2030-01-02T00:00Z','2030-01-01T00:00Z','Fixture venue','Fixture address','Asia/Ho_Chi_Minh',10,'PUBLISHED')",id,"QA-"+id);
        try{
            start();
            assertEquals(25,db.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE success",Integer.class));
            assertNull(db.queryForMap("SELECT latitude,longitude FROM events WHERE id=?",event).get("latitude"));
            assertThrows(org.springframework.dao.DataAccessException.class,()->db.update("UPDATE events SET latitude=1 WHERE id=?",event));
            assertThrows(org.springframework.dao.DataAccessException.class,()->db.update("UPDATE events SET latitude=91,longitude=0 WHERE id=?",event));
            assertThrows(org.springframework.dao.DataAccessException.class,()->db.update("UPDATE gift_settings SET enabled=true WHERE surface='PUBLISHED'"));
            assertThrows(org.springframework.dao.DataAccessException.class,()->db.update("UPDATE gift_settings SET first_asset_id=? WHERE surface='DRAFT'",UUID.randomUUID()));
            assertEquals(2,db.queryForObject("SELECT count(*) FROM gift_settings WHERE NOT enabled AND visibility='PRIVATE'",Integer.class));
            db.update("INSERT INTO admin_users(username,password_hash,role) VALUES(?,?,'EDITOR')","fixture-editor","{bcrypt}"+new BCryptPasswordEncoder(4).encode(password));
            var owner=new Browser();var editor=new Browser();var guest=new Browser();var anonymous=new Browser();
            String admin="/api/v1/admin/gifts";
            assertEquals(401,anonymous.request("GET",admin,"",false).statusCode());
            owner.login("fixture-owner");editor.login("fixture-editor");
            for(String path:List.of(admin,admin+"/assets/"+UUID.randomUUID()))assertEquals(403,editor.request("GET",path,"",false).statusCode());
            assertEquals(403,editor.request("POST",admin+"/publish",publish(0,0,true),true).statusCode());
            assertEquals(403,owner.request("POST",admin+"/publish",publish(0,0,true),false).statusCode());
            assertEquals(0,db.queryForObject("SELECT revision FROM gift_settings WHERE surface='PUBLISHED'",Integer.class));
            var out=new ByteArrayOutputStream();ImageIO.write(new BufferedImage(220,220,BufferedImage.TYPE_INT_RGB),"PNG",out);byte[] png=out.toByteArray();
            UUID first=upload(owner,png),second=upload(owner,png);
            assertArrayEquals(png,owner.request("GET",admin+"/assets/"+first,"",false).body());
            assertEquals(200,owner.request("PUT",admin,input("DUAL","PRIVATE",first,second,0),true).statusCode());
            assertEquals(409,owner.request("PUT",admin,input("SINGLE","PRIVATE",first,second,0),true).statusCode());
            assertEquals(422,owner.request("POST",admin+"/publish",publish(1,0,false),true).statusCode());
            assertEquals(200,owner.request("POST",admin+"/publish",publish(1,0,true),true).statusCode());
            db.update("UPDATE wedding SET published=true,mode='MANUAL_OPEN' WHERE id=1");
            String publicPath="/api/v1/public/weddings/our-wedding/gifts";
            assertFalse(anonymous.body(anonymous.request("GET",publicPath,"",false),200).get("enabled").asBoolean());
            assertEquals(403,anonymous.request("GET",publicPath+"/assets/"+first,"",false).statusCode());
            String token=context.getBean(TokenService.class).mint();
            db.update("INSERT INTO invitations(id,display_name,token_hash,token_cipher) VALUES(?,'QA fixture',?,?)",invitation,TokenService.hash(token),context.getBean(TokenService.class).encrypt(token,invitation));
            db.update("INSERT INTO assignments(invitation_id,event_id,max_people) VALUES(?,?,2)",invitation,event);
            String guestPath="/api/v1/guest/invitations/"+invitation;
            assertEquals(403,anonymous.request("GET",guestPath+"/gifts","",false).statusCode());
            guest.csrf();assertEquals(200,guest.request("POST","/api/v1/guest-links/redeem","{\"token\":\""+token+"\"}",true).statusCode());
            assertEquals(403,guest.request("GET",guestPath+"/gifts","",false).statusCode());
            assertEquals(200,guest.request("POST",guestPath+"/open","{}",true).statusCode());
            assertEquals(2,guest.body(guest.request("GET",guestPath+"/gifts","",false),200).get("recipients").size());
            var image=guest.request("GET",guestPath+"/gifts/assets/"+first,"",false);assertEquals(200,image.statusCode());assertArrayEquals(png,image.body());assertTrue(image.headers().firstValue("Cache-Control").orElse("").contains("no-store"));
            assertEquals(403,guest.request("GET",guestPath+"/gifts/assets/"+UUID.randomUUID(),"",false).statusCode());
            assertEquals(200,owner.request("PUT",admin,input("SINGLE","PUBLIC",first,second,1),true).statusCode());
            // Draft does not affect live scope until explicit publish.
            assertEquals(2,guest.body(guest.request("GET",guestPath+"/gifts","",false),200).get("recipients").size());
            assertEquals(200,owner.request("POST",admin+"/publish",publish(2,1,true),true).statusCode());
            assertEquals(1,anonymous.body(anonymous.request("GET",publicPath,"",false),200).get("recipients").size());
            assertEquals(403,guest.request("GET",guestPath+"/gifts/assets/"+second,"",false).statusCode());
            assertEquals(200,anonymous.request("GET",publicPath+"/assets/"+first,"",false).statusCode());
            assertEquals(403,anonymous.request("GET",publicPath+"/assets/"+second,"",false).statusCode());
            // Map endpoint uses real JDBC, optimistic version, and published-change notice.
            String location="/api/v1/admin/events/"+event+"/location";
            assertEquals(422,owner.request("PUT",location,"{\"latitude\":0,\"longitude\":0,\"confirmed\":true,\"expectedVersion\":0}",true).statusCode());
            assertEquals(200,owner.request("PUT",location,"{\"latitude\":0,\"longitude\":0,\"confirmed\":true,\"changeNotice\":\"QA fixture change\",\"expectedVersion\":0}",true).statusCode());
            assertEquals(1,db.queryForObject("SELECT revision FROM events WHERE id=?",Integer.class,event));
            db.update("UPDATE events SET address='QA fixture changed' WHERE id=?",event);assertNull(db.queryForMap("SELECT latitude FROM events WHERE id=?",event).get("latitude"));
            // Feed pagination, tied timestamps and assignment filtering through actual SQL.
            assertEquals(422,guest.request("POST",guestPath+"/wishes","{\"message\":\"QA fixture wish\",\"eventId\":\""+other+"\"}",true).statusCode());
            assertEquals(0,db.queryForObject("SELECT count(*) FROM wishes",Integer.class));
            for(int n=0;n<15;n++)wish(invitation,null,"APPROVED");
            wish(invitation,event,"APPROVED");wish(invitation,other,"APPROVED");wish(invitation,null,"PENDING");
            var page=anonymous.body(anonymous.request("GET","/api/v1/public/weddings/our-wedding/wishes","",false),200);
            assertEquals(12,page.get("items").size());String cursor=page.get("nextCursor").asString();
            var rest=anonymous.body(anonymous.request("GET","/api/v1/public/weddings/our-wedding/wishes?cursor="+cursor,"",false),200);assertEquals(3,rest.get("items").size());
            var ids=new HashSet<String>();page.get("items").forEach(item->assertTrue(ids.add(item.get("id").asString())));rest.get("items").forEach(item->assertTrue(ids.add(item.get("id").asString())));
            var guestPage=guest.body(guest.request("GET",guestPath+"/approved-wishes","",false),200);
            var guestRest=guest.body(guest.request("GET",guestPath+"/approved-wishes?cursor="+guestPage.get("nextCursor").asString(),"",false),200);assertEquals(4,guestRest.get("items").size());
            // Existing mutation boundaries remain protected with real sessions and CSRF enabled.
            assertEquals(403,anonymous.request("POST","/api/v1/admin/wishes/"+UUID.randomUUID(),"{}",false).statusCode());
            assertEquals(403,guest.request("POST",guestPath+"/wishes","{\"message\":\"QA fixture wish\"}",false).statusCode());
            db.update("INSERT INTO invitation_pin_protection(invitation_id,enabled,pin_hash,security_revision) VALUES(?,true,?,1)",invitation,new BCryptPasswordEncoder(4).encode("123456"));
            assertEquals(428,guest.request("GET",guestPath+"/gifts/assets/"+first,"",false).statusCode());
            assertEquals(428,guest.request("GET",guestPath+"/approved-wishes","",false).statusCode());
            assertEquals(200,guest.request("POST",guestPath+"/pin","{\"pin\":\"123456\"}",true).statusCode());
            assertEquals(200,guest.request("GET",guestPath+"/gifts/assets/"+first,"",false).statusCode());
            db.update("UPDATE invitations SET mode='SCHEDULED',open_at=now()+interval '1 day' WHERE id=?",invitation);
            assertEquals(403,guest.request("GET",guestPath+"/gifts/assets/"+first,"",false).statusCode());
            db.update("UPDATE invitations SET mode='INHERIT',archived=true WHERE id=?",invitation);
            assertEquals(403,guest.request("GET",guestPath+"/approved-wishes","",false).statusCode());
            db.update("UPDATE invitations SET archived=false WHERE id=?",invitation);
            db.update("UPDATE invitations SET active=false WHERE id=?",invitation);
            assertEquals(403,guest.request("GET",guestPath+"/gifts/assets/"+first,"",false).statusCode());assertEquals(403,guest.request("GET",guestPath+"/approved-wishes","",false).statusCode());
            db.update("UPDATE wedding SET published=false WHERE id=1");assertEquals(403,anonymous.request("GET",publicPath+"/assets/"+first,"",false).statusCode());
            // New context/DataSource/session repository proves persisted configuration and PNG survive app restart.
            context.close();context=null;start();
            var reloaded=new Browser();reloaded.login("fixture-owner");
            var config=reloaded.body(reloaded.request("GET",admin,"",false),200);assertEquals(2,config.get("draft").get("revision").asInt());assertEquals(2,config.get("published").get("revision").asInt());assertEquals(second.toString(),config.get("draft").get("second").get("assetId").asString());
            assertArrayEquals(png,reloaded.request("GET",admin+"/assets/"+first,"",false).body());
            assertEquals(25,db.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE success",Integer.class));
        }finally{if(context!=null)context.close();}
    }
    void wish(UUID invitation,UUID event,String state){
        db.update("INSERT INTO wishes(id,invitation_id,event_id,display_name,message,state,created_at,moderated_at) VALUES(?,?,?,'QA fixture','QA fixture message',?,'2030-01-01T00:00Z',?)",UUID.randomUUID(),invitation,event,state,"APPROVED".equals(state)?java.sql.Timestamp.from(java.time.Instant.parse("2030-01-01T00:00:00Z")):null);
    }
}