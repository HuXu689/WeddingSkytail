package vn.wedding.invitation.invitations;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import javax.crypto.*;
import javax.crypto.spec.*;
import java.security.*;
import java.util.*;
import java.nio.charset.StandardCharsets;

@Service
public class TokenService {
    private final byte[] key;
    private final SecureRandom random = new SecureRandom();
    public TokenService(@Value("${app.token-key}") String key) { this.key=Base64.getDecoder().decode(key); if(this.key.length!=32) throw new IllegalArgumentException("TOKEN_KEY must encode 32 bytes"); }
    public String mint() { byte[] bytes=new byte[32]; random.nextBytes(bytes); return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    public static String hash(String value) { try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); } catch(GeneralSecurityException e) { throw new IllegalStateException(e); } }
    public String pseudonym(String session, UUID id) { try { Mac mac=Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(key,"HmacSHA256")); return HexFormat.of().formatHex(mac.doFinal((id+":"+session).getBytes(StandardCharsets.UTF_8))); } catch(GeneralSecurityException e) { throw new IllegalStateException(e); } }
    public String encrypt(String token, UUID id) { try {
        byte[] nonce=new byte[12]; random.nextBytes(nonce); Cipher c=Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.ENCRYPT_MODE,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,nonce)); c.updateAAD(id.toString().getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(nonce)+"."+Base64.getEncoder().encodeToString(c.doFinal(token.getBytes(StandardCharsets.UTF_8)));
    } catch(GeneralSecurityException e) { throw new IllegalStateException("Cannot encrypt credential", e); } }
    public String decrypt(String encrypted, UUID id) { try {
        String[] parts=encrypted.split("\\."); Cipher c=Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.DECRYPT_MODE,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,Base64.getDecoder().decode(parts[0]))); c.updateAAD(id.toString().getBytes(StandardCharsets.UTF_8));
        return new String(c.doFinal(Base64.getDecoder().decode(parts[1])),StandardCharsets.UTF_8);
    } catch(GeneralSecurityException e) { throw new IllegalStateException("Cannot decrypt credential"); } }
}