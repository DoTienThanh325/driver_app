package com.driverapp.apigateway;

import com.driverapp.apigateway.config.ResilienceProperties;
import com.driverapp.apigateway.filter.*;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfSystemProperty(named = "test.redis.port", matches = "[0-9]+")
class RateLimitIntegrationTest {
    LettuceConnectionFactory connection;
    ReactiveStringRedisTemplate redis;
    SimpleMeterRegistry meters;
    String group;
    String identity;
    PolicyRateLimitFilter first;
    PolicyRateLimitFilter second;
    @BeforeEach void setup() {
        connection = new LettuceConnectionFactory("127.0.0.1", Integer.getInteger("test.redis.port"));
        connection.afterPropertiesSet(); connection.start();
        redis = new ReactiveStringRedisTemplate(connection);
        meters = new SimpleMeterRegistry();
        var p = new ResilienceProperties(); group = "test-" + UUID.randomUUID(); identity = "test:" + UUID.randomUUID();
        var policy = new ResilienceProperties.Policy(); policy.setRate(1); policy.setBurst(1); policy.setWindowSeconds(10);
        p.getPolicies().put(group, policy);
        first = new PolicyRateLimitFilter(redis, p, new TrustedClientIpResolver(p), meters);
        second = new PolicyRateLimitFilter(redis, p, new TrustedClientIpResolver(p), meters);
    }
    @AfterEach void close() throws Exception {
        String digest = HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                .digest(identity.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        redis.delete("driverapp:gateway:" + group + ":" + digest).block();
        connection.destroy(); meters.close();
    }
    @Test void uploadConcurrencyIsSharedAndCancellationReleasesLeases() throws Exception {
        var props = new ResilienceProperties();
        var p = new ResilienceProperties.Policy(); p.setRate(100); p.setBurst(100);
        props.getPolicies().put("upload", p);
        var a = new PolicyRateLimitFilter(redis, props, new TrustedClientIpResolver(props), meters);
        var b = new PolicyRateLimitFilter(redis, props, new TrustedClientIpResolver(props), meters);
        String subject = java.util.UUID.randomUUID().toString();
        var token = org.springframework.security.oauth2.jwt.Jwt.withTokenValue("test").header("alg", "RS256").subject(subject).build();
        var principal = new org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken(token);
        java.util.function.Supplier<org.springframework.web.server.ServerWebExchange> request = () -> {
            var exchange = MockServerWebExchange.from(MockServerHttpRequest.post("/api/drivers/register"))
                    .mutate().principal(reactor.core.publisher.Mono.just(principal)).build();
            exchange.getAttributes().put(org.springframework.cloud.gateway.support.ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR,
                    org.springframework.cloud.gateway.route.Route.async().id("upload").uri("lb://driverservice")
                            .predicate(e -> true).metadata("policy", "upload").build());
            return exchange;
        };
        String digest = HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                .digest(("user:" + subject).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        String lease = "driverapp:upload:" + digest;
        reactor.core.Disposable one = null, two = null;
        try {
            one = a.filter(request.get(), e -> reactor.core.publisher.Mono.never()).subscribe();
            org.awaitility.Awaitility.await().atMost(java.time.Duration.ofSeconds(3)).until(() -> Long.valueOf(1).equals(redis.opsForZSet().size(lease).block()));
            two = b.filter(request.get(), e -> reactor.core.publisher.Mono.never()).subscribe();
            org.awaitility.Awaitility.await().atMost(java.time.Duration.ofSeconds(3)).until(() -> Long.valueOf(2).equals(redis.opsForZSet().size(lease).block()));
            var error = assertThrows(ResponseStatusException.class, () -> a.filter(request.get(), e -> reactor.core.publisher.Mono.empty()).block());
            assertEquals(503, error.getStatusCode().value());
            one.dispose(); two.dispose();
            org.awaitility.Awaitility.await().atMost(java.time.Duration.ofSeconds(3)).until(() -> Long.valueOf(0).equals(redis.opsForZSet().size(lease).block()));
        } finally {
            if (one != null) one.dispose();
            if (two != null) two.dispose();
            redis.delete(lease, "driverapp:gateway:upload:" + digest).block();
        }
    }
    @Test void redisFailureReturns503RatherThan429OrUnlimitedRequests() {
        var broken = org.mockito.Mockito.mock(ReactiveStringRedisTemplate.class);
        org.mockito.Mockito.when(broken.execute(org.mockito.ArgumentMatchers.any(org.springframework.data.redis.core.script.RedisScript.class),
                org.mockito.ArgumentMatchers.anyList(), org.mockito.ArgumentMatchers.anyList()))
                .thenReturn(reactor.core.publisher.Flux.error(new org.springframework.data.redis.RedisConnectionFailureException("test unavailable")));
        var props = new ResilienceProperties(); props.getPolicies().put(group, new ResilienceProperties.Policy());
        var filter = new PolicyRateLimitFilter(broken, props, new TrustedClientIpResolver(props), meters);
        var ex = MockServerWebExchange.from(MockServerHttpRequest.get("/api/trips"));
        var error = assertThrows(ResponseStatusException.class, () -> filter.check(group, identity, ex).block());
        assertEquals(503, error.getStatusCode().value());
        assertNull(ex.getResponse().getHeaders().getFirst("Retry-After"));
    }
    @Test void twoGatewayInstancesUseOneQuotaAndReturnRetryAfter() {
        var ex = MockServerWebExchange.from(MockServerHttpRequest.get("/api/trips"));
        first.check(group, identity, ex).block();
        var error = assertThrows(ResponseStatusException.class, () -> second.check(group, identity, ex).block());
        assertEquals(429, error.getStatusCode().value());
        assertTrue(Integer.parseInt(ex.getResponse().getHeaders().getFirst("Retry-After")) > 0);
    }
}
