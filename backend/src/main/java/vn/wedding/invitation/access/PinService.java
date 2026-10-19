package vn.wedding.invitation.access;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.wedding.invitation.common.ApiErrors;

/**
 * PIN protection for one invitation (FR19). The PIN is never stored in clear, never logged and never returned twice:
 * the owner sees it once when the server generates or resets it. A verified session stores the invitation's
 * security_revision, so resetting or disabling the PIN invalidates every session that was already verified.
 */
@Service
@Transactional
public class PinService {
    /** Same cost as owner password hashing so a stolen hash is equally expensive to attack offline. */
    private static final BCryptPasswordEncoder ENCODER=new BCryptPasswordEncoder(12);
    private static final SecureRandom RANDOM=new SecureRandom();
    private static final int DIGITS=6, MIN_LENGTH=4, MAX_LENGTH=12;
    /** Per-invitation ceiling for wrong guesses; the per-address window in RequestLimits is the outer layer. */
    private static final int MAX_FAILURES=20;
    private static final long FAILURE_WINDOW_MS=Duration.ofMinutes(15).toMillis();
    private static final int FAILURE_MAP_LIMIT=1000;
    private static final String ENABLE_SQL="INSERT INTO invitation_pin_protection(invitation_id,enabled,pin_hash,security_revision,updated_at) VALUES(?,true,?,1,now()) ON CONFLICT (invitation_id) DO UPDATE SET enabled=true,pin_hash=excluded.pin_hash,security_revision=invitation_pin_protection.security_revision+1,updated_at=now()";
    private final JdbcTemplate db;
    private final AccessGate gate;
    private final ConcurrentHashMap<UUID,Attempts> failures=new ConcurrentHashMap<>();
    public PinService(JdbcTemplate db,AccessGate gate) { this.db=db; this.gate=gate; }
    public record Set(String pin) {}
    /** Bounded wrong-guess counter; kept pure so it can be unit-tested without a database. */
    public record Attempts(long windowStart,int count) {}
    public static Attempts next(Attempts current,long nowMillis,long windowMillis) {
        if(current==null || nowMillis-current.windowStart()>windowMillis) return new Attempts(nowMillis,1);
        return new Attempts(current.windowStart(),current.count()+1);
    }
    public static boolean blocked(Attempts current,long nowMillis,int max,long windowMillis) {
        return current!=null && nowMillis-current.windowStart()<=windowMillis && current.count()>=max;
    }
    /** Never returns the hash or the PIN itself. */
    public Map<String,Object> status(UUID id) {
        requireInvitation(id);
        Map<String,Object> result=new HashMap<>();
        var rows=db.queryForList("SELECT enabled,security_revision,updated_at FROM invitation_pin_protection WHERE invitation_id=?",id);
        if(rows.isEmpty()) { result.put("enabled",false); result.put("securityRevision",0); result.put("updatedAt",null); return result; }
        var row=rows.getFirst();
        result.put("enabled",row.get("enabled")); result.put("securityRevision",row.get("security_revision")); result.put("updatedAt",row.get("updated_at"));
        return result;
    }
    /** A blank owner value makes the server generate a PIN and return it exactly once. */
    public Map<String,Object> enable(UUID id,String requested) {
        requireInvitation(id);
        boolean generated=requested==null||requested.isBlank();
        String pin=generated?randomPin():normalize(requested);
        db.update(ENABLE_SQL,id,ENCODER.encode(pin));
        audit("PIN_ENABLE",id); failures.remove(id);
        Map<String,Object> result=new HashMap<>();
        result.put("enabled",true); result.put("generated",generated); result.put("pin",generated?pin:null);
        return result;
    }
    public void disable(UUID id) {
        requireInvitation(id);
        db.update("UPDATE invitation_pin_protection SET enabled=false,pin_hash=NULL,security_revision=security_revision+1,updated_at=now() WHERE invitation_id=?",id);
        audit("PIN_DISABLE",id); failures.remove(id);
    }
    /** Generates a new PIN, bumps security_revision and therefore invalidates every verified session. */
    public Map<String,Object> reset(UUID id) {
        requireInvitation(id);
        String pin=randomPin();
        db.update(ENABLE_SQL,id,ENCODER.encode(pin));
        audit("PIN_RESET",id); failures.remove(id);
        Map<String,Object> result=new HashMap<>();
        result.put("enabled",true); result.put("generated",true); result.put("pin",pin);
        return result;
    }
    /** Guest step: needs an existing grant and open access policy, but must not require the PIN itself. */
    public Map<String,Object> verify(UUID id,String submitted,HttpSession session) {
        gate.checkWithoutPin(id,session);
        long now=System.currentTimeMillis();
        if(blocked(failures.get(id),now,MAX_FAILURES,FAILURE_WINDOW_MS)) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút.");
        var rows=db.queryForList("SELECT enabled,pin_hash,security_revision FROM invitation_pin_protection WHERE invitation_id=? FOR UPDATE",id);
        Map<String,Object> result=new HashMap<>();
        if(rows.isEmpty() || !Boolean.TRUE.equals(rows.getFirst().get("enabled"))) { session.setAttribute("pin:"+id,0L); result.put("enabled",false); result.put("verified",true); return result; }
        var row=rows.getFirst();
        if(submitted==null || !ENCODER.matches(submitted.strip(),(String)row.get("pin_hash"))) {
            if(failures.size()>FAILURE_MAP_LIMIT) failures.clear();
            failures.put(id,next(failures.get(id),now,FAILURE_WINDOW_MS));
            throw ApiErrors.pinIncorrect();
        }
        failures.remove(id);
        session.setAttribute("pin:"+id,((Number)row.get("security_revision")).longValue());
        result.put("enabled",true); result.put("verified",true);
        return result;
    }
    static String normalize(String pin) {
        String value=pin==null?"":pin.strip().replaceAll("\\s+","");
        ApiErrors.require(value.matches("\\d{"+MIN_LENGTH+","+MAX_LENGTH+"}"),"Mã PIN phải gồm "+MIN_LENGTH+" đến "+MAX_LENGTH+" chữ số.");
        return value;
    }
    static String randomPin() { String value; do { value=generate(); } while(trivial(value)); return value; }
    private static String generate() {
        StringBuilder digits=new StringBuilder(DIGITS);
        for(int index=0;index<DIGITS;index++) digits.append((char)('0'+(index==0?1+RANDOM.nextInt(9):RANDOM.nextInt(10))));
        return digits.toString();
    }
    /** Rejects PINs a guest could guess from the printed invitation itself. */
    static boolean trivial(String value) { return value.chars().distinct().count()==1 || "123456".equals(value) || "654321".equals(value); }
    private void requireInvitation(UUID id) { ApiErrors.require(id!=null&&!db.queryForList("SELECT 1 FROM invitations WHERE id=?",id).isEmpty(),"Không tìm thấy lời mời."); }
    private void audit(String action,UUID id) { db.update("INSERT INTO audit(action,target) VALUES(?,?)",action,id.toString()); }
}