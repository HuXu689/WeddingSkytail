package vn.wedding.invitation;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.wedding.invitation.wedding.LayoutService;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LayoutValidationTest {
 List<LayoutService.Item> valid(){return new ArrayList<>(List.of("MUSIC","COUNTDOWN","STORY","CONTENT","ALBUM","THANKS").stream().map(key->new LayoutService.Item(key,true)).toList());}
 LayoutService.Input input(List<LayoutService.Item> items){return new LayoutService.Input(items,1,1,0);}
 @Test void acceptsReorderAndToggle(){var rows=valid();Collections.reverse(rows);rows.set(0,new LayoutService.Item("THANKS",false));assertDoesNotThrow(()->LayoutService.validate(input(rows)));}
 @Test void cannotHideEventsOrInjectCode(){for(String key:List.of("EVENTS","RSVP","<script>")){var rows=valid();rows.set(0,new LayoutService.Item(key,false));assertThrows(RuntimeException.class,()->LayoutService.validate(input(rows)));}}
 @Test void requiresCompleteUniqueKnownSections(){assertThrows(RuntimeException.class,()->LayoutService.validate(input(List.of())));var rows=valid();rows.set(1,rows.get(0));assertThrows(RuntimeException.class,()->LayoutService.validate(input(rows)));}
 @Test void staleSaveNeverDeletesDraft(){var db=mock(JdbcTemplate.class);when(db.queryForMap("SELECT * FROM wedding WHERE id=1 FOR UPDATE")).thenReturn(Map.of("version",1L));assertThrows(RuntimeException.class,()->new LayoutService(db).save(input(valid())));verify(db).queryForMap("SELECT * FROM wedding WHERE id=1 FOR UPDATE");verifyNoMoreInteractions(db);}
}