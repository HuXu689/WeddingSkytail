package vn.wedding.invitation.access;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

/** PIN rules (FR19) that must hold without a database: normalisation, generation, hashing and wrong-guess throttling. */
class PinProtectionTest {
    @Test void acceptsOnlyDigitPinsWithinTheAllowedLength() {
        assertEquals("482915",PinService.normalize(" 482 915 "));
        assertEquals("1234",PinService.normalize("1234"));
        assertThrows(ResponseStatusException.class,()->PinService.normalize("123"));
        assertThrows(ResponseStatusException.class,()->PinService.normalize("1234567890123"));
        assertThrows(ResponseStatusException.class,()->PinService.normalize("abcd"));
        assertThrows(ResponseStatusException.class,()->PinService.normalize(null));
    }
    @Test void generatedPinsAreSixDigitsNotStartingWithZeroAndNeverTrivial() {
        for(int attempt=0;attempt<300;attempt++) {
            String pin=PinService.randomPin();
            assertTrue(pin.matches("\\d{6}"),pin);
            assertNotEquals('0',pin.charAt(0),pin);
            assertFalse(PinService.trivial(pin),pin);
        }
        assertTrue(PinService.trivial("111111"));
        assertTrue(PinService.trivial("123456"));
        assertTrue(PinService.trivial("654321"));
        assertFalse(PinService.trivial("482915"));
    }
    @Test void storedHashDoesNotContainThePinAndMatchesOnlyThatPin() {
        BCryptPasswordEncoder encoder=new BCryptPasswordEncoder(4); // low cost keeps the unit test fast
        String hash=encoder.encode("482915");
        assertFalse(hash.contains("482915"),"PIN không được xuất hiện trong bản băm");
        assertTrue(encoder.matches("482915",hash));
        assertFalse(encoder.matches("482916",hash));
    }
    @Test void wrongGuessCounterBlocksInsideTheWindowAndRestartsAfterIt() {
        long now=1_000_000L, window=60_000L;
        assertFalse(PinService.blocked(null,now,3,window));
        PinService.Attempts attempts=PinService.next(null,now,window);
        assertEquals(1,attempts.count());
        attempts=PinService.next(attempts,now+1_000,window); assertEquals(2,attempts.count());
        attempts=PinService.next(attempts,now+2_000,window); assertEquals(3,attempts.count());
        assertTrue(PinService.blocked(attempts,now+3_000,3,window));
        assertFalse(PinService.blocked(attempts,now+window+1,3,window),"Cửa sổ mới phải được mở lại");
        assertEquals(1,PinService.next(attempts,now+window+1,window).count());
    }
}