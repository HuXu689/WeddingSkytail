package vn.wedding.invitation;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.wedding.invitation.wedding.EventLocationService;
import vn.wedding.invitation.wedding.EventLocationService.Input;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** All locations here are synthetic validation fixtures, not wedding configuration. */
class EventLocationTest {
    private final JdbcTemplate db=mock(JdbcTemplate.class);
    private final EventLocationService service=new EventLocationService(db);
    private final UUID id=UUID.randomUUID();
    private void event(String state,long version,BigDecimal lat,BigDecimal lng){
        var row=new HashMap<String,Object>();row.put("state",state);row.put("version",version);row.put("latitude",lat);row.put("longitude",lng);
        when(db.queryForList("SELECT state,version,latitude,longitude FROM events WHERE id=? FOR UPDATE",id)).thenReturn(List.of(row));
    }
    @Test void rejectsIncompleteNonFiniteOutOfRangeOrUnconfirmedCoordinates(){
        for(var input:List.of(new Input(1d,null,true,null,0),new Input(null,1d,true,null,0),new Input(Double.NaN,0d,true,null,0),new Input(0d,Double.POSITIVE_INFINITY,true,null,0),new Input(90.1,0d,true,null,0),new Input(0d,-180.1,true,null,0),new Input(0d,0d,false,null,0),new Input(null,null,false,null,-1),new Input(0d,0d,true,"x".repeat(501),0))){
            assertThrows(RuntimeException.class,()->service.save(id,input));
        }
        verifyNoInteractions(db);
    }
    @Test void nullInputIsRejectedBeforeDatabase(){assertThrows(RuntimeException.class,()->service.save(id,null));verifyNoInteractions(db);}
    @Test void acceptsZeroAndBoundaryAndRoundsOnce(){
        var zero=EventLocationService.validate(new Input(0d,0d,true,null,0));
        assertEquals(0,zero.latitude().compareTo(BigDecimal.ZERO));
        assertEquals(new BigDecimal("90.0000000"),EventLocationService.validate(new Input(90d,-180d,true,null,0)).latitude());
        assertEquals(new BigDecimal("1.1234568"),EventLocationService.validate(new Input(1.12345678,2d,true,null,0)).latitude());
    }
    @Test void missingEventDoesNotUpdate(){assertThrows(RuntimeException.class,()->service.save(id,new Input(0d,0d,true,null,0)));verify(db,never()).update(anyString(),any(Object[].class));}
    @Test void staleVersionDoesNotUpdate(){event("DRAFT",2,null,null);assertThrows(RuntimeException.class,()->service.save(id,new Input(0d,0d,true,null,1)));verify(db,never()).update(anyString(),any(Object[].class));}
    @Test void cancelledEventDoesNotUpdate(){event("CANCELLED",2,null,null);assertThrows(RuntimeException.class,()->service.save(id,new Input(0d,0d,true,"Fixture notice",2)));verify(db,never()).update(anyString(),any(Object[].class));}
    @Test void publishedChangeRequiresNotice(){event("PUBLISHED",2,null,null);assertThrows(RuntimeException.class,()->service.save(id,new Input(0d,0d,true,"  ",2)));verify(db,never()).update(anyString(),any(Object[].class));}
    @Test void unchangedCoordinatesDoNotBumpVersion(){
        event("PUBLISHED",2,new BigDecimal("1.0"),new BigDecimal("2.000"));
        assertEquals(2L,service.save(id,new Input(1d,2d,true,null,2)).get("version"));
        verify(db,never()).update(anyString(),any(Object[].class));
    }
    @Test void draftWritesNormalizedCoordinatesAndIdOnlyAudit(){
        event("DRAFT",2,null,null);
        assertEquals(3L,service.save(id,new Input(0d,0d,true,null,2)).get("version"));
        verify(db).update("UPDATE events SET latitude=?,longitude=?,change_notice=COALESCE(?,change_notice),revision=revision+?,version=version+1 WHERE id=?",new BigDecimal("0.0000000"),new BigDecimal("0.0000000"),null,0,id);
        verify(db).update("INSERT INTO audit(action,target,actor) VALUES('EVENT_LOCATION',?,?)",id.toString(),"owner");
        var order=inOrder(db);order.verify(db).queryForMap("SELECT * FROM wedding WHERE id=1 FOR UPDATE");order.verify(db).queryForList("SELECT state,version,latitude,longitude FROM events WHERE id=? FOR UPDATE",id);
    }
    @Test void publishedClearRequiresNoticeAndBumpsRevision(){
        event("PUBLISHED",2,BigDecimal.ZERO,BigDecimal.ZERO);
        service.save(id,new Input(null,null,false," Fixture notice ",2));
        verify(db).update("UPDATE events SET latitude=?,longitude=?,change_notice=COALESCE(?,change_notice),revision=revision+?,version=version+1 WHERE id=?",null,null,"Fixture notice",1,id);
    }
    @Test void additiveMigrationKeepsExistingCoordinatesEmptyAndClearsStaleMarkers() throws Exception {
        String sql=Files.readString(Path.of("src/main/resources/db/migration/V24__event_map_coordinates.sql"));
        assertTrue(sql.contains("latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180"));
        assertTrue(sql.contains("latitude IS NOT NULL AND longitude IS NOT NULL"));
        assertTrue(sql.contains("NEW.address IS DISTINCT FROM OLD.address"));
        assertTrue(sql.contains("NEW.latitude := NULL"));
        assertFalse(sql.contains("UPDATE events SET"));assertFalse(sql.contains("DEFAULT 0"));
    }
}