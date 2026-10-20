package vn.wedding.invitation.wishes;

import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.wedding.invitation.access.AccessGate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WishQueueTest {
    @Test void queueCountsTheFilteredSetAndUsesStableOrdering() {
        var db=mock(JdbcTemplate.class);
        when(db.queryForObject(anyString(),eq(Long.class),any(Object[].class))).thenReturn(51L);
        when(db.queryForMap(anyString())).thenReturn(Map.of("pending",51L));
        when(db.queryForList(anyString(),any(Object[].class))).thenReturn(List.of());
        var result=new WishService(db,mock(AccessGate.class)).queue(1,"PENDING","QA");
        assertEquals(51L,result.get("total"));
        verify(db).queryForObject(contains("WHERE w.state=? AND (w.display_name ILIKE ? OR w.message ILIKE ?)"),eq(Long.class),eq("PENDING"),eq("%QA%"),eq("%QA%"));
        verify(db).queryForList(contains("w.created_at DESC,w.id DESC LIMIT 50 OFFSET ?"),eq("PENDING"),eq("%QA%"),eq("%QA%"),eq(50));
    }
}