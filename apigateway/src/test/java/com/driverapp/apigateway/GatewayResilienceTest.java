package com.driverapp.apigateway;

import com.driverapp.apigateway.config.ResilienceProperties;
import com.driverapp.apigateway.filter.*;
import io.github.resilience4j.circuitbreaker.*;
import java.net.InetSocketAddress;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.cloud.gateway.support.ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR;

class GatewayResilienceTest {
    @Test void spoofedForwardedHeaderIsIgnoredUnlessPeerIsTrusted() {
        var p = new ResilienceProperties();
        var ex = MockServerWebExchange.from(MockServerHttpRequest.get("/api/trips")
                .remoteAddress(new InetSocketAddress("192.0.2.2", 1234)).header("X-Forwarded-For", "198.51.100.9"));
        assertEquals("192.0.2.2", new TrustedClientIpResolver(p).resolve(ex));
        p.setTrustedProxies(java.util.List.of("192.0.2.0/24"));
        assertEquals("198.51.100.9", new TrustedClientIpResolver(p).resolve(ex));
    }
    @Test void walksProxyChainFromTrustedEnd() {
        var p = new ResilienceProperties(); p.setTrustedProxies(java.util.List.of("10.0.0.0/8"));
        var ex = MockServerWebExchange.from(MockServerHttpRequest.get("/api/users")
                .remoteAddress(new InetSocketAddress("10.0.0.1", 1))
                .header("X-Forwarded-For", "1.1.1.1, 192.0.2.5, 10.0.0.2"));
        assertEquals("192.0.2.5", new TrustedClientIpResolver(p).resolve(ex));
    }
    @Test void circuitBlocksRequestsAndExcludesBusinessErrors() {
        var registry = CircuitBreakerRegistry.of(CircuitBreakerConfig.custom().slidingWindowSize(2).minimumNumberOfCalls(2).build());
        var filter = new DependencyCircuitBreakerFilter(registry, properties());
        for(int i = 0; i < 3; i++) {
            var ex = exchange(1000);
            assertThrows(ResponseStatusException.class, () -> filter.filter(ex,
                    e -> Mono.error(new ResponseStatusException(HttpStatus.CONFLICT))).block());
        }
        assertEquals(CircuitBreaker.State.CLOSED, registry.circuitBreaker("bookingservice-read").getState());
        for(int i = 0; i < 2; i++) filter.filter(exchange(1000), e -> { e.getResponse().setStatusCode(HttpStatus.SERVICE_UNAVAILABLE); return Mono.empty(); }).block();
        var error = assertThrows(ResponseStatusException.class, () -> filter.filter(exchange(1000), e -> fail("must not call downstream")).block());
        assertEquals(503, error.getStatusCode().value());
    }
    @Test void deadlineReturns504() {
        var filter = new DependencyCircuitBreakerFilter(CircuitBreakerRegistry.ofDefaults(), properties());
        var error = assertThrows(ResponseStatusException.class, () -> filter.filter(exchange(30), e -> Mono.never()).block(Duration.ofSeconds(1)));
        assertEquals(504, error.getStatusCode().value());
    }
    private ResilienceProperties properties() {
        var p = new ResilienceProperties();
        p.getPolicies().put("read", new ResilienceProperties.Policy());
        return p;
    }
    private MockServerWebExchange exchange(int deadline) {
        var ex = MockServerWebExchange.from(MockServerHttpRequest.get("/api/trips"));
        ex.getAttributes().put(GATEWAY_ROUTE_ATTR, Route.async().id("booking").uri("lb://bookingservice")
                .predicate(e -> true).metadata("policy", "read").metadata("deadline-ms", deadline).build());
        return ex;
    }
}
