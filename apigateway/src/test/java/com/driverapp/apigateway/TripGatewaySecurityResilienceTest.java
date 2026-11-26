package com.driverapp.apigateway;

import com.driverapp.apigateway.config.ResilienceProperties;
import com.driverapp.apigateway.filter.DependencyCircuitBreakerFilter;
import com.driverapp.apigateway.filter.PolicyRateLimitFilter;
import com.driverapp.apigateway.filter.PreAuthenticationRateLimitWebFilter;
import com.driverapp.apigateway.filter.TrustedClientIpResolver;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;
import static org.springframework.cloud.gateway.support.ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR;

class TripGatewaySecurityResilienceTest {

    // [TC-SEC-01] Spam POST /api/trips vượt ngưỡng rate limit -> trả 429 TOO_MANY_REQUESTS + header Retry-After, chặn không cho xuống bookingservice
    @Test
    @SuppressWarnings("unchecked")
    void rateLimitBlocksTripSpamWith429AndRetryAfterHeader() {
        ReactiveStringRedisTemplate redis = mock(ReactiveStringRedisTemplate.class);
        SimpleMeterRegistry meters = new SimpleMeterRegistry();
        ResilienceProperties props = writePolicyProperties();
        PolicyRateLimitFilter filter = new PolicyRateLimitFilter(redis, props, new TrustedClientIpResolver(props), meters);

        // Redis Lua trả [0 (blocked), 2500 (ms retry-after)]
        when(redis.execute(any(RedisScript.class), anyList(), anyList()))
                .thenReturn(Flux.just(List.of(0L, 2500L)));

        ServerWebExchange exchange = tripExchange("user-spam-1", "192.0.2.10");
        AtomicBoolean downstreamCalled = new AtomicBoolean(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> filter.filter(exchange, e -> {
                    downstreamCalled.set(true);
                    return Mono.empty();
                }).block());

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatusCode());
        assertEquals("3", exchange.getResponse().getHeaders().getFirst("Retry-After"));
        assertFalse(downstreamCalled.get());
        assertEquals(1.0, meters.get("gateway.quota.rejected").tag("policy", "write").counter().count());
    }

    // [TC-SEC-02] Cô lập quota theo user:sub -> User A bị chặn 429 nhưng User B vẫn đặt chuyến bình thường
    @Test
    @SuppressWarnings("unchecked")
    void rateLimitIsolatesQuotaPerAuthenticatedUserSubject() {
        ReactiveStringRedisTemplate redis = mock(ReactiveStringRedisTemplate.class);
        SimpleMeterRegistry meters = new SimpleMeterRegistry();
        ResilienceProperties props = writePolicyProperties();
        PolicyRateLimitFilter filter = new PolicyRateLimitFilter(redis, props, new TrustedClientIpResolver(props), meters);

        // User A bị chặn (0), User B được phép (1)
        when(redis.execute(any(RedisScript.class), anyList(), anyList()))
                .thenReturn(Flux.just(List.of(0L, 1000L)))
                .thenReturn(Flux.just(List.of(1L, 0L)));

        assertThrows(ResponseStatusException.class,
                () -> filter.filter(tripExchange("user-A", "192.0.2.10"), e -> Mono.empty()).block());

        AtomicBoolean userBForwarded = new AtomicBoolean(false);
        filter.filter(tripExchange("user-B", "192.0.2.10"), e -> {
            userBForwarded.set(true);
            return Mono.empty();
        }).block();

        assertTrue(userBForwarded.get());
    }

    // [TC-SEC-03] Redis lỗi/sập khi check request limit -> fail-closed trả 503 SERVICE_UNAVAILABLE
    @Test
    @SuppressWarnings("unchecked")
    void rateLimitFailsClosedWith503WhenRedisIsUnavailable() {
        ReactiveStringRedisTemplate redis = mock(ReactiveStringRedisTemplate.class);
        SimpleMeterRegistry meters = new SimpleMeterRegistry();
        ResilienceProperties props = writePolicyProperties();
        PolicyRateLimitFilter filter = new PolicyRateLimitFilter(redis, props, new TrustedClientIpResolver(props), meters);

        when(redis.execute(any(RedisScript.class), anyList(), anyList()))
                .thenReturn(Flux.error(new RuntimeException("Redis connection refused")));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> filter.filter(tripExchange("user-1", "192.0.2.10"), e -> Mono.empty()).block());

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatusCode());
        assertEquals(1.0, meters.get("gateway.quota.redis.errors").tag("policy", "write").counter().count());
    }

    // [TC-SEC-04] Chống giả mạo X-Forwarded-For từ IP không tin cậy -> dùng IP thật để rate limit và chặn 429
    @Test
    @SuppressWarnings("unchecked")
    void preAuthRateLimitIgnoresSpoofedForwardedForFromUntrustedProxy() {
        ReactiveStringRedisTemplate redis = mock(ReactiveStringRedisTemplate.class);
        SimpleMeterRegistry meters = new SimpleMeterRegistry();
        ResilienceProperties props = writePolicyProperties();
        TrustedClientIpResolver ipResolver = new TrustedClientIpResolver(props);
        PolicyRateLimitFilter policyFilter = new PolicyRateLimitFilter(redis, props, ipResolver, meters);
        PreAuthenticationRateLimitWebFilter preAuthFilter = new PreAuthenticationRateLimitWebFilter(policyFilter, ipResolver, props);

        when(redis.execute(any(RedisScript.class), anyList(), anyList()))
                .thenReturn(Flux.just(List.of(0L, 1500L)));

        MockServerWebExchange spoofedExchange = MockServerWebExchange.from(
                MockServerHttpRequest.post("/api/trips")
                        .remoteAddress(new InetSocketAddress("198.51.100.77", 4567))
                        .header("X-Forwarded-For", "10.0.0.1")
        );

        assertEquals("198.51.100.77", ipResolver.resolve(spoofedExchange));
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> preAuthFilter.filter(spoofedExchange, e -> Mono.empty()).block());
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatusCode());
    }

    // [TC-CB-01 & TC-CB-02] Lỗi nghiệp vụ 409 (tranh chuyến) không mở Circuit Breaker; lỗi 503 liên tiếp -> mở mạch OPEN chặn ngay tại Gateway
    @Test
    void gatewayCircuitBreakerIgnores409TripConflictAndOpensOn503Outage() {
        CircuitBreakerRegistry registry = CircuitBreakerRegistry.of(
                CircuitBreakerConfig.custom().slidingWindowSize(2).minimumNumberOfCalls(2).build());
        ResilienceProperties props = writePolicyProperties();
        DependencyCircuitBreakerFilter cbFilter = new DependencyCircuitBreakerFilter(registry, props);

        // 1. Lỗi nghiệp vụ 409 CONFLICT (2 tài xế tranh chuyến / đặt trùng) KHÔNG được mở mạch
        for (int i = 0; i < 3; i++) {
            ServerWebExchange ex = tripExchange("user-1", "192.0.2.10");
            assertThrows(ResponseStatusException.class,
                    () -> cbFilter.filter(ex, e -> Mono.error(new ResponseStatusException(HttpStatus.CONFLICT))).block());
        }
        assertEquals(CircuitBreaker.State.CLOSED, registry.circuitBreaker("bookingservice-write").getState());

        // 2. Downstream trả 503 liên tiếp -> Circuit Breaker mở mạch (OPEN)
        AtomicInteger downstreamCalls = new AtomicInteger();
        for (int i = 0; i < 2; i++) {
            ServerWebExchange ex = tripExchange("user-1", "192.0.2.10");
            cbFilter.filter(ex, e -> {
                downstreamCalls.incrementAndGet();
                e.getResponse().setStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
                return Mono.empty();
            }).block();
        }
        assertEquals(CircuitBreaker.State.OPEN, registry.circuitBreaker("bookingservice-write").getState());

        // 3. Request thứ 3 bị chặn ngay ở Gateway với 503, không chạm xuống bookingservice
        ResponseStatusException openEx = assertThrows(ResponseStatusException.class,
                () -> cbFilter.filter(tripExchange("user-1", "192.0.2.10"), e -> {
                    downstreamCalls.incrementAndGet();
                    return Mono.empty();
                }).block());
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, openEx.getStatusCode());
        assertEquals(2, downstreamCalls.get());
    }

    private ResilienceProperties writePolicyProperties() {
        ResilienceProperties p = new ResilienceProperties();
        ResilienceProperties.Policy write = new ResilienceProperties.Policy();
        write.setRate(5);
        write.setBurst(5);
        write.setWindowSeconds(10);
        p.getPolicies().put("write", write);
        p.getPolicies().put("ingress", write);
        return p;
    }

    private ServerWebExchange tripExchange(String subject, String remoteIp) {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.post("/api/trips")
                        .remoteAddress(new InetSocketAddress(remoteIp, 1234))
        );
        exchange.getAttributes().put(GATEWAY_ROUTE_ATTR, Route.async()
                .id("booking-route")
                .uri("lb://bookingservice")
                .predicate(e -> true)
                .metadata("policy", "write")
                .metadata("deadline-ms", 1000)
                .build());

        Jwt jwt = Jwt.withTokenValue("mock-token")
                .header("alg", "RS256")
                .subject(subject)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(300))
                .build();
        return exchange.mutate().principal(Mono.just(new JwtAuthenticationToken(jwt))).build();
    }
}
