package com.driverapp.userservice;

import com.driverapp.userservice.config.RateLimitProperties;
import com.driverapp.userservice.exception.QuotaExceededException;
import com.driverapp.userservice.service.impl.RedisAuthRateLimitService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfSystemProperty(named = "test.redis.port", matches = "[0-9]+")
class AuthRateLimitIntegrationTest {
    LettuceConnectionFactory connection;
    StringRedisTemplate redis;
    RedisAuthRateLimitService quotas;
    String group;
    String subject;
    SimpleMeterRegistry meters;
    final List<String> keys = new ArrayList<>();
    @BeforeEach void setup() {
        connection = new LettuceConnectionFactory("127.0.0.1", Integer.getInteger("test.redis.port"));
        connection.afterPropertiesSet(); connection.start();
        redis = new StringRedisTemplate(connection);
        group = "test-" + UUID.randomUUID(); subject = UUID.randomUUID().toString();
        var props = new RateLimitProperties();
        var policy = new RateLimitProperties.Policy(); policy.setLimit(5); policy.setSeconds(10);
        props.getPolicies().put(group, policy);
        meters = new SimpleMeterRegistry();
        quotas = new RedisAuthRateLimitService(redis, props, meters, "integration-test-key");
    }
    @AfterEach void close() {
        for (String key : keys) redis.delete(key);
        connection.destroy(); meters.close();
    }
    @Test void concurrentRequestsShareOneAtomicQuotaAndDenialsDoNotExtendWindow() throws Exception {
        var key = key(group, subject); keys.add(key);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<Boolean>> work = new ArrayList<>();
            for (int i = 0; i < 30; i++) work.add(executor.submit(() -> {
                try { quotas.check(group, subject); return true; }
                catch (QuotaExceededException limit) { assertTrue(limit.getRetryAfter() > 0); return false; }
            }));
            int accepted = 0;
            for (var future : work) if (future.get()) accepted++;
            assertEquals(5, accepted);
        }
        Long ttl = redis.getExpire(key, TimeUnit.MILLISECONDS);
        Thread.sleep(100);
        assertThrows(QuotaExceededException.class, () -> quotas.check(group, subject));
        assertTrue(redis.getExpire(key, TimeUnit.MILLISECONDS) < ttl);
    }
    @Test void challengeCanBeConsumedOnlyOnceAcrossInstances() {
        keys.add(key("consumed", subject));
        quotas.consumeChallenge(subject, 10);
        var error = assertThrows(ResponseStatusException.class, () -> quotas.consumeChallenge(subject, 10));
        assertEquals(401, error.getStatusCode().value());
    }
    private String key(String policy, String value) {
        try {
            var mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec("integration-test-key".getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
            return "driverapp:auth:" + policy + ":" + HexFormat.of().formatHex(mac.doFinal((policy + ":" + value).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (Exception e) { throw new IllegalStateException(e); }
    }
}
