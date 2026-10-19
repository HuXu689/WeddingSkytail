package vn.wedding.invitation;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.wedding.invitation.wedding.SectionService;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class SectionPrivacyTest {
 @Test void publicQueryNeverIncludesPrivateOrDisabledSections(){var db=mock(JdbcTemplate.class);new SectionService(db).list(false,false);verify(db).queryForList("SELECT kind,audience,enabled,title,body,starts_at AS \"startsAt\",color FROM wedding_sections WHERE surface=? AND enabled=true AND audience='PUBLIC' ORDER BY position","PUBLISHED");}
 @Test void privateQueryStillRequiresPublishedEnabledContent(){var db=mock(JdbcTemplate.class);new SectionService(db).list(false,true);verify(db).queryForList("SELECT kind,audience,enabled,title,body,starts_at AS \"startsAt\",color FROM wedding_sections WHERE surface=? AND enabled=true ORDER BY position","PUBLISHED");}
 @Test void staleSaveCannotDeleteDraft(){var db=mock(JdbcTemplate.class);when(db.queryForMap("SELECT * FROM wedding WHERE id=1 FOR UPDATE")).thenReturn(Map.of("version",5L));assertThrows(RuntimeException.class,()->new SectionService(db).save(new SectionService.Input(List.of(),1,1,4)));verify(db).queryForMap("SELECT * FROM wedding WHERE id=1 FOR UPDATE");verifyNoMoreInteractions(db);}
}