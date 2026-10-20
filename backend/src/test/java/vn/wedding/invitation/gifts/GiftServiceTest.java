package vn.wedding.invitation.gifts;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.*;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import vn.wedding.invitation.access.AccessGate;
import vn.wedding.invitation.common.ApiErrors;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Generated PNG fixtures contain no QR or payment details. JDBC is mocked, not persistence QA. */
class GiftServiceTest {
    final JdbcTemplate db=mock(JdbcTemplate.class);
    final AccessGate gate=mock(AccessGate.class);
    final GiftService service=new GiftService(db,gate);
    final UUID first=UUID.randomUUID(),second=UUID.randomUUID(),invitation=UUID.randomUUID();
    final MockHttpSession session=new MockHttpSession();
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    void role(String role){SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("fixture-owner","unused",List.of(new SimpleGrantedAuthority("ROLE_"+role))));}
    Map<String,Object> row(boolean enabled,String mode,String visibility){
        var row=new HashMap<String,Object>();row.put("enabled",enabled);row.put("mode",mode);row.put("visibility",visibility);row.put("revision",2L);
        row.put("first_label","Fixture A");row.put("first_description","");row.put("first_asset_id",first);
        row.put("second_label","Fixture B");row.put("second_description","");row.put("second_asset_id",second);return row;
    }
    void settings(String surface,Map<String,Object> row){when(db.queryForMap("SELECT * FROM gift_settings WHERE surface=? FOR UPDATE",surface)).thenReturn(row);}
    void exists(UUID id){when(db.queryForList("SELECT id FROM gift_assets WHERE id=?",id)).thenReturn(List.of(Map.of("id",id)));}
    GiftService.Input input(String mode){return new GiftService.Input(true,mode,"PRIVATE",new GiftService.Recipient(" Fixture A ","",first),new GiftService.Recipient("Fixture B","",second),2);}
    @Test void ownerRequiredForEveryAdministrativeOperation(){
        for(String role:List.of("EDITOR","UNKNOWN")){
            role(role);
            assertThrows(RuntimeException.class,()->service.configuration());
            assertThrows(RuntimeException.class,()->service.save(input("SINGLE")));
            assertThrows(RuntimeException.class,()->service.publish(new GiftService.Publish(2,2,true)));
            assertThrows(RuntimeException.class,()->service.upload(null));
            assertThrows(RuntimeException.class,()->service.ownerAsset(first));
        }
        SecurityContextHolder.clearContext();assertThrows(RuntimeException.class,()->service.configuration());verifyNoInteractions(db,gate);
    }
    @Test void rejectsInvalidConfigurationBeforeDatabase(){
        role("OWNER");
        assertThrows(RuntimeException.class,()->service.save(null));
        assertThrows(RuntimeException.class,()->service.save(input("OTHER")));
        assertThrows(RuntimeException.class,()->service.save(new GiftService.Input(false,"SINGLE","PUBLIC",new GiftService.Recipient("x".repeat(81),"",null),new GiftService.Recipient("","",null),0)));
        assertThrows(RuntimeException.class,()->service.save(new GiftService.Input(false,"SINGLE","PRIVATE",new GiftService.Recipient("","",null),null,0)));
        assertThrows(RuntimeException.class,()->service.save(new GiftService.Input(false,"SINGLE","UNKNOWN",new GiftService.Recipient("","",null),new GiftService.Recipient("","",null),0)));
        verifyNoInteractions(db);
    }
    @Test void savingSingleRetainsSecondRecipientAndDoesNotPublish(){
        role("OWNER");settings("DRAFT",row(true,"DUAL","PRIVATE"));exists(first);exists(second);
        assertEquals(3L,service.save(input("SINGLE")).get("revision"));
        verify(db).update("UPDATE gift_settings SET enabled=?,mode=?,visibility=?,first_label=?,first_description=?,first_asset_id=?,second_label=?,second_description=?,second_asset_id=?,revision=revision+1 WHERE surface='DRAFT'",true,"SINGLE","PRIVATE","Fixture A","",first,"Fixture B","",second);
        verify(db,never()).queryForMap("SELECT * FROM gift_settings WHERE surface=? FOR UPDATE","PUBLISHED");
        var order=inOrder(db);order.verify(db).queryForMap("SELECT id FROM wedding WHERE id=1 FOR UPDATE");order.verify(db).queryForMap("SELECT * FROM gift_settings WHERE surface=? FOR UPDATE","DRAFT");
    }
    @Test void staleDraftCannotWrite(){
        role("OWNER");var row=row(false,"SINGLE","PRIVATE");row.put("revision",3L);settings("DRAFT",row);
        assertThrows(RuntimeException.class,()->service.save(input("SINGLE")));verify(db,never()).update(anyString(),any(Object[].class));
    }
    @Test void nonexistentAssetCannotBeSaved(){
        role("OWNER");settings("DRAFT",row(false,"SINGLE","PRIVATE"));
        assertThrows(RuntimeException.class,()->service.save(input("SINGLE")));verify(db,never()).update(anyString(),any(Object[].class));
    }
    void publishSetup(boolean enabled,String mode){role("OWNER");settings("DRAFT",row(enabled,mode,"PRIVATE"));settings("PUBLISHED",row(false,"SINGLE","PRIVATE"));exists(first);exists(second);}
    @Test void enabledPublicationRequiresExplicitConfirmation(){
        publishSetup(true,"SINGLE");assertThrows(RuntimeException.class,()->service.publish(new GiftService.Publish(2,2,false)));verify(db,never()).update(anyString(),any(Object[].class));
    }
    @Test void dualPublicationRequiresBothRecipients(){
        publishSetup(true,"DUAL");var row=row(true,"DUAL","PRIVATE");row.put("second_asset_id",null);settings("DRAFT",row);
        assertThrows(RuntimeException.class,()->service.publish(new GiftService.Publish(2,2,true)));verify(db,never()).update(anyString(),any(Object[].class));
    }
    @Test void publishedVersionConflictDoesNotWrite(){
        publishSetup(true,"DUAL");assertThrows(RuntimeException.class,()->service.publish(new GiftService.Publish(2,1,true)));verify(db,never()).update(anyString(),any(Object[].class));
    }
    @Test void confirmedPublicationCopiesDraftButNeverBankDetailsToAudit(){
        publishSetup(true,"DUAL");assertEquals(3L,service.publish(new GiftService.Publish(2,2,true)).get("revision"));
        verify(db).update("UPDATE gift_settings SET enabled=?,mode=?,visibility=?,first_label=?,first_description=?,first_asset_id=?,second_label=?,second_description=?,second_asset_id=?,revision=revision+1 WHERE surface='PUBLISHED'",true,"DUAL","PRIVATE","Fixture A","",first,"Fixture B","",second);
        verify(db).update("INSERT INTO audit(action,target,actor) VALUES(?,'gift-settings',?)","GIFT_PUBLISH","fixture-owner");
    }
    @Test void disabledPublicationDoesNotRequireQrConfirmation(){publishSetup(false,"SINGLE");assertEquals(3L,service.publish(new GiftService.Publish(2,2,false)).get("revision"));}
    @Test void privatePublicViewContainsNoRecipientMetadata(){
        when(db.queryForList("SELECT id FROM wedding WHERE id=1 AND slug=? AND published=true FOR UPDATE","fixture")).thenReturn(List.of(Map.of("id",1)));
        settings("PUBLISHED",row(true,"DUAL","PRIVATE"));var view=service.publicView("fixture");assertFalse(view.enabled());assertTrue(view.recipients().isEmpty());
        assertThrows(RuntimeException.class,()->service.publicAsset("fixture",first));verify(db,never()).queryForList("SELECT png FROM gift_assets WHERE id=?",first);
    }
    @Test void unpublishedPublicRequestDoesNotReadSettings(){assertThrows(RuntimeException.class,()->service.publicView("fixture"));verify(db,never()).queryForMap(anyString(),any(Object[].class));}
    @Test void deniedGuestCannotReadSettingsOrAsset(){
        when(gate.check(invitation,session,true)).thenThrow(ApiErrors.unavailable());
        assertThrows(RuntimeException.class,()->service.guestView(invitation,session));assertThrows(RuntimeException.class,()->service.guestAsset(invitation,session,first));verifyNoInteractions(db);
    }
    @Test void guestSeesOnlyActivePublishedPanelsAndCannotReadRetainedSecondImage(){
        settings("PUBLISHED",row(true,"SINGLE","PRIVATE"));assertEquals(List.of(first),service.guestView(invitation,session).recipients().stream().map(GiftService.Panel::assetId).toList());
        assertThrows(RuntimeException.class,()->service.guestAsset(invitation,session,second));verify(db,never()).queryForList("SELECT png FROM gift_assets WHERE id=?",second);
    }
    @Test void selectedAssetIsCheckedOnEveryReadAndDisabledGiftStopsServing(){
        settings("PUBLISHED",row(true,"SINGLE","PRIVATE"));byte[] png={1,2,3};when(db.queryForList("SELECT png FROM gift_assets WHERE id=?",first)).thenReturn(List.of(Map.of("png",png)));
        assertArrayEquals(png,service.guestAsset(invitation,session,first));settings("PUBLISHED",row(false,"SINGLE","PRIVATE"));
        assertThrows(RuntimeException.class,()->service.guestAsset(invitation,session,first));verify(gate,times(2)).check(invitation,session,true);verify(db,times(1)).queryForList("SELECT png FROM gift_assets WHERE id=?",first);
    }
    @Test void explicitlyPublicGiftServesOnlySelectedAsset(){
        when(db.queryForList("SELECT id FROM wedding WHERE id=1 AND slug=? AND published=true FOR UPDATE","fixture")).thenReturn(List.of(Map.of("id",1)));
        settings("PUBLISHED",row(true,"DUAL","PUBLIC"));assertEquals(2,service.publicView("fixture").recipients().size());
        UUID other=UUID.randomUUID();assertThrows(RuntimeException.class,()->service.publicAsset("fixture",other));verify(db,never()).queryForList("SELECT png FROM gift_assets WHERE id=?",other);
    }
    @Test void uploadPreservesPngBytesWithoutMediaConversion() throws Exception {
        role("OWNER");byte[] png=png(220,240);
        UUID id=service.upload(new MockMultipartFile("file","fixture.png","image/png",png));
        verify(db).update("INSERT INTO gift_assets(id,png,width,height) VALUES(?,?,?,?)",id,png,220,240);
    }
    @Test void uploadRejectsWrongMimeCorruptAndSmallImagesBeforeWriting() throws Exception {
        role("OWNER");
        for(var file:List.of(new MockMultipartFile("file","fixture.svg","image/svg+xml","<svg/>".getBytes()),new MockMultipartFile("file","fixture.png","image/png",new byte[]{1,2,3}),new MockMultipartFile("file","fixture.png","image/png",png(10,10)),new MockMultipartFile("file","fixture.png","image/png",new byte[5*1024*1024+1])))
            assertThrows(RuntimeException.class,()->service.upload(file));
        verifyNoInteractions(db);
    }
    static byte[] png(int width,int height) throws Exception {var out=new ByteArrayOutputStream();ImageIO.write(new BufferedImage(width,height,BufferedImage.TYPE_INT_RGB),"PNG",out);return out.toByteArray();}
}