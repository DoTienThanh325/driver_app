package com.driverapp.userservice.service.impl;

import com.driverapp.userservice.config.RateLimitProperties;
import com.driverapp.userservice.exception.QuotaExceededException;
import com.driverapp.userservice.service.AuthRateLimitService;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import io.micrometer.core.instrument.MeterRegistry;

@Service
public class RedisAuthRateLimitService implements AuthRateLimitService {
    private final StringRedisTemplate redis;
    private final RateLimitProperties properties;
    private final byte[] secret;
    private final MeterRegistry meters;
    private final DefaultRedisScript<Long> script = new DefaultRedisScript<>();
    public RedisAuthRateLimitService(StringRedisTemplate redis, RateLimitProperties properties, MeterRegistry meters,
            @Value("${app.otp.challenge-secret}") String secret) {
        this.redis = redis; this.properties = properties; this.meters = meters;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        script.setLocation(new ClassPathResource("redis/auth-rate-limit.lua"));
        script.setResultType(Long.class);
    }
    public void check(String policy, String subject) {
        if (!properties.isEnabled()) return;
        var p = properties.policy(policy);
        checkLimit(policy, subject.trim(), p.getLimit(), p.getSeconds());
    }
    public void checkChallenge(String signedChallenge, int lifetimeSeconds) {
        if (!properties.isEnabled()) return;
        checkLimit("challenge-attempts", signedChallenge, 5, Math.max(1, lifetimeSeconds));
    }
    private void checkLimit(String policy, String subject, int limit, int seconds) {
        Long wait;
        try {
            wait = redis.execute(script, List.of(key(policy, subject)), String.valueOf(limit), String.valueOf(seconds));
            if (wait == null) throw new IllegalStateException("No quota result");
        } catch (Exception unavailable) {
            meters.counter("auth.quota.redis.errors", "policy", policy).increment();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Authentication quota unavailable", unavailable);
        }
        if (wait > 0) {
            meters.counter("auth.quota.rejected", "policy", policy).increment();
            throw new QuotaExceededException(wait);
        }
    }
    public void consumeChallenge(String signedChallenge, int lifetimeSeconds) {
        // Replay prevention remains enabled even if rate limits are temporarily disabled.
        Boolean accepted;
        try {
            accepted = redis.opsForValue().setIfAbsent(key("consumed", signedChallenge), "1",
                    Duration.ofSeconds(Math.max(1, lifetimeSeconds)));
            if (accepted == null) throw new IllegalStateException("No challenge result");
        } catch (Exception unavailable) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Challenge state unavailable", unavailable);
        }
        if (!accepted) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "OTP challenge already used");
    }
    private String key(String policy, String subject) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return "driverapp:auth:" + policy + ":" + HexFormat.of().formatHex(mac.doFinal((policy + ":" + subject).getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException ex) { throw new IllegalStateException(ex); }
    }
}
