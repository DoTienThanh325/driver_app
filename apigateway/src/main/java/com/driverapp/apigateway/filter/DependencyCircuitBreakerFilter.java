package com.driverapp.apigateway.filter;

import com.driverapp.apigateway.config.ResilienceProperties;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.springframework.cloud.gateway.filter.*;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.*;
import reactor.core.publisher.Mono;
import static org.springframework.cloud.gateway.support.ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR;

@Component
public class DependencyCircuitBreakerFilter implements GlobalFilter, Ordered {
    private final CircuitBreakerRegistry breakers;
    private final ResilienceProperties properties;
    public DependencyCircuitBreakerFilter(CircuitBreakerRegistry breakers, ResilienceProperties properties) {
        this.breakers = breakers; this.properties = properties;
    }
    public int getOrder() { return -2; }
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        Route route = exchange.getAttribute(GATEWAY_ROUTE_ATTR);
        String group = String.valueOf(route.getMetadata().getOrDefault("policy", "read"));
        var p = properties.policy(group);
        var breaker = breakers.circuitBreaker(route.getUri().getHost() + "-" + group,
                io.github.resilience4j.circuitbreaker.CircuitBreakerConfig.from(breakers.getDefaultConfig())
                        .slowCallDurationThreshold(p.getSlow()).build());
        long deadline = ((Number)route.getMetadata().getOrDefault("deadline-ms", 6000)).longValue();
        return Mono.defer(() -> {
            boolean enabled = properties.isCircuitBreakerEnabled();
            if (enabled && !breaker.tryAcquirePermission())
                return Mono.error(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Dependency circuit is open"));
            long start = System.nanoTime();
            Mono<Void> execution = chain.filter(exchange);
            if (deadline > 0) {
                execution = execution.timeout(Duration.ofMillis(deadline));
            }
            return execution
                    .doOnSuccess(v -> {
                        if (!enabled) return;
                        var status = exchange.getResponse().getStatusCode();
                        if (status != null && status.is5xxServerError())
                            breaker.onError(System.nanoTime() - start, TimeUnit.NANOSECONDS, new IllegalStateException("Downstream 5xx"));
                        else if (status != null && status.is4xxClientError()) breaker.releasePermission();
                        else breaker.onSuccess(System.nanoTime() - start, TimeUnit.NANOSECONDS);
                    }).doOnError(ex -> {
                        if (!enabled) return;
                        if (ex instanceof ResponseStatusException rse && rse.getStatusCode().is4xxClientError()) breaker.releasePermission();
                        else breaker.onError(System.nanoTime() - start, TimeUnit.NANOSECONDS, ex);
                    }).doOnCancel(() -> { if (enabled) breaker.releasePermission(); })
                    .onErrorMap(TimeoutException.class, ex -> new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, "Downstream deadline exceeded", ex));
        });
    }
}
