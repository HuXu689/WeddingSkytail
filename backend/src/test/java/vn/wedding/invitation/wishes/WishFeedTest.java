package vn.wedding.invitation.wishes;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import vn.wedding.invitation.access.AccessGate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WishFeedTest {
    private final JdbcTemplate db=mock(JdbcTemplate.class);
    private final AccessGate gate=mock(AccessGate.class);
    private final WishFeedService feed=new WishFeedService(db,gate);
    private final UUID invitationId=UUID.randomUUID();
    private final MockHttpSession session=new MockHttpSession();
    private static final Instant AT=Instant.parse("2026-01-01T00:00:00Z");
    private static Map<String,Object> fixture(int index){
        return Map.of("id",new UUID(0,index),"display_name","Fixture only","message","Synthetic wish","created_at",Timestamp.from(AT));
    }
    @Test void gateFailureDoesNotReadFeedEvenWithMalformedCursor(){
        when(gate.check(invitationId,session,true)).thenThrow(new IllegalStateException("fixture denied"));
        assertThrows(IllegalStateException.class,()->feed.guestFeed(invitationId,session,"bad"));
        verifyNoInteractions(db);
    }
    @Test void unpublishedSlugCannotReadFeed(){
        assertThrows(RuntimeException.class,()->feed.publicFeed("fixture-unpublished",null));
        verify(db).queryForList("SELECT id FROM wedding WHERE slug=? AND published=true","fixture-unpublished");
        verifyNoMoreInteractions(db);
    }
    @Test void publicScopeIsApprovedAndNotEventSpecific(){
        when(db.queryForList("SELECT id FROM wedding WHERE slug=? AND published=true","fixture")).thenReturn(List.of(Map.of("id",1)));
        feed.publicFeed("fixture",null);
        var sql=ArgumentCaptor.forClass(String.class);
        verify(db).queryForList(sql.capture(),eq(13));
        assertTrue(sql.getValue().contains("w.state='APPROVED' AND w.event_id IS NULL"));
        assertFalse(sql.getValue().contains("SELECT *"));
        assertFalse(sql.getValue().contains("invitation_id"));
    }
    @Test void guestScopeUsesAssignmentsNotAuthorIdentity(){
        feed.guestFeed(invitationId,session,null);
        var sql=ArgumentCaptor.forClass(String.class);
        verify(db).queryForList(sql.capture(),eq(invitationId),eq(13));
        assertTrue(sql.getValue().contains("w.state='APPROVED'"));
        assertTrue(sql.getValue().contains("a.invitation_id=? AND a.event_id=w.event_id"));
        assertTrue(sql.getValue().contains("e.state IN ('PUBLISHED','CANCELLED')"));
        assertFalse(sql.getValue().contains("w.invitation_id=?"));
    }
    @Test void lookaheadIsNotReturnedAndCursorUsesLastVisibleRow(){
        var rows=new ArrayList<Map<String,Object>>();
        for(int i=13;i>=1;i--)rows.add(fixture(i));
        when(db.queryForList(anyString(),eq(invitationId),eq(13))).thenReturn(rows);
        var page=feed.guestFeed(invitationId,session,null);
        assertEquals(12,page.items().size());
        assertEquals(new UUID(0,2),page.items().getLast().id());
        assertEquals(WishFeedService.encode(AT,new UUID(0,2)),page.nextCursor());
        assertEquals(Set.of("id","display_name","message","created_at","pinned","heart_count"),
            Arrays.stream(WishFeedService.Item.class.getRecordComponents()).map(c->c.getName()).collect(java.util.stream.Collectors.toSet()));
    }
    @Test void publicWishHeartRequiresPublishedSlugAndApprovedPublicWish(){
        UUID wishId=UUID.randomUUID();
        when(db.queryForList("SELECT id FROM wedding WHERE slug=? AND published=true","our-wedding")).thenReturn(List.of(Map.of("id",1)));
        when(db.queryForList("UPDATE wishes SET heart_count=heart_count+? WHERE id=? AND state='APPROVED' AND event_id IS NULL RETURNING heart_count",1,wishId))
            .thenReturn(List.of(Map.of("heart_count",25L)));
        var res=feed.heartPublicWish("our-wedding",wishId,1);
        assertEquals(25L,res.get("heart_count"));
    }
    @Test void guestWishHeartEnforcesAccessGateFirst(){
        UUID wishId=UUID.randomUUID();
        when(gate.check(invitationId,session,true)).thenThrow(new IllegalStateException("denied"));
        assertThrows(IllegalStateException.class,()->feed.heartGuestWish(invitationId,wishId,1,session));
        verifyNoInteractions(db);
    }
    @Test void cursorUsesStrictTupleComparisonForTiedTimestamps(){
        UUID last=new UUID(0,2);
        String cursor=WishFeedService.encode(AT,last);
        var page=feed.guestFeed(invitationId,session,cursor);
        var sql=ArgumentCaptor.forClass(String.class);
        verify(db).queryForList(sql.capture(),eq(invitationId),eq(false),eq(Timestamp.from(AT)),eq(last),eq(13));
        assertTrue(sql.getValue().contains("(w.pinned,w.created_at,w.id)<(?,?,?)"));
        assertTrue(sql.getValue().contains("ORDER BY w.pinned DESC,w.created_at DESC,w.id DESC LIMIT ?"));
        assertTrue(page.items().isEmpty());assertNull(page.nextCursor());
    }
    @Test void malformedCursorsNeverReachSql(){
        for(String cursor:List.of(""," ","bad", "x".repeat(161),WishFeedService.encode(Instant.MAX,UUID.randomUUID()),Base64.getUrlEncoder().encodeToString("not-a-date|not-a-uuid".getBytes()))){
            assertThrows(RuntimeException.class,()->feed.guestFeed(invitationId,session,cursor));
        }
        verifyNoInteractions(db);
    }
    @Test void pinnedCursorPreservesPinPartitionAndTimestampTieBreaker(){
        UUID last=new UUID(0,2);
        feed.guestFeed(invitationId,session,WishFeedService.encode(AT,last,true));
        verify(db).queryForList(contains("(w.pinned,w.created_at,w.id)<(?,?,?)"),eq(invitationId),eq(true),eq(Timestamp.from(AT)),eq(last),eq(13));
    }
    @Test void exactPageHasNoNextCursor(){
        var rows=new ArrayList<Map<String,Object>>();for(int i=12;i>=1;i--)rows.add(fixture(i));
        when(db.queryForList(anyString(),eq(invitationId),eq(13))).thenReturn(rows);
        assertNull(feed.guestFeed(invitationId,session,null).nextCursor());
    }
}