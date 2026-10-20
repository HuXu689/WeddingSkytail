package vn.wedding.invitation.wishes;

import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.wedding.invitation.access.AccessGate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WishPinTest {
    final JdbcTemplate db=mock(JdbcTemplate.class);
    final WishService service=new WishService(db,mock(AccessGate.class));
    final UUID id=UUID.randomUUID();
    void row(String state){when(db.queryForList("SELECT * FROM wishes WHERE id=? FOR UPDATE",id)).thenReturn(List.of(Map.of("state",state,"revision",2L)));}
    @Test void pendingCannotBePinned(){
        row("PENDING");assertThrows(RuntimeException.class,()->service.pin(id,true,2));
        verify(db,never()).update(anyString(),any(Object[].class));
    }
    @Test void staleRevisionDoesNotWrite(){
        row("APPROVED");assertThrows(RuntimeException.class,()->service.pin(id,true,1));
        verify(db,never()).update(anyString(),any(Object[].class));
    }
    @Test void pinAndUnpinIncrementRevisionAndAudit(){
        row("APPROVED");service.pin(id,true,2);service.pin(id,false,2);
        verify(db).update("UPDATE wishes SET pinned=?,revision=revision+1 WHERE id=?",true,id);
        verify(db).update("UPDATE wishes SET pinned=?,revision=revision+1 WHERE id=?",false,id);
        verify(db).update("INSERT INTO audit(action,target) VALUES(?,?)","WISH_PIN",id.toString());
        verify(db).update("INSERT INTO audit(action,target) VALUES(?,?)","WISH_UNPIN",id.toString());
    }
    @Test void hidingClearsPinInSameUpdate(){
        row("APPROVED");service.moderate(id,"REJECTED",2,()->"fixture-owner");
        verify(db).update(contains("pinned=CASE WHEN ?='APPROVED' THEN pinned ELSE false END"),eq("REJECTED"),eq("REJECTED"),eq("fixture-owner"),eq(id));
    }
}