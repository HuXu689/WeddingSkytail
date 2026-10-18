package vn.wedding.invitation;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.wedding.invitation.identity.OwnerBootstrap;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class OwnerBootstrapTest {
    @Test void existingOwnerIgnoresChangedOrMissingEnvironment() {
        var db=mock(JdbcTemplate.class);
        when(db.queryForObject("SELECT count(*) FROM admin_users",Integer.class)).thenReturn(1);
        assertDoesNotThrow(()->new OwnerBootstrap(db,"","changed").run(null));
        verify(db).execute("LOCK TABLE admin_users IN EXCLUSIVE MODE");
        verify(db).queryForObject("SELECT count(*) FROM admin_users",Integer.class);
        verifyNoMoreInteractions(db);
    }
    @Test void firstBootstrapRequiresValidCredentials() {
        var db=mock(JdbcTemplate.class);
        when(db.queryForObject("SELECT count(*) FROM admin_users",Integer.class)).thenReturn(0);
        assertThrows(IllegalArgumentException.class,()->new OwnerBootstrap(db,"owner","").run(null));
    }
}