package com.driverapp.apigateway.filter;

import com.driverapp.apigateway.config.ResilienceProperties;
import io.micrometer.core.instrument.MeterRegistry;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import org.springframework.cloud.gateway.filter.*;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.core.Ordered;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.*;
import reactor.core.publisher.Mono;
import static org.springframework.cloud.gateway.support.ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR;

@Component
public class PolicyRateLimitFilter implements GlobalFilter, Ordered {
    private final ReactiveStringRedisTemplate redis;
    private final ResilienceProperties properties;
    private final TrustedClientIpResolver ips;
    private final MeterRegistry meters;
    private final DefaultRedisScript<Long> uploadLease = new DefaultRedisScript<>();
    private final DefaultRedisScript<List> script = new DefaultRedisScript<>();
    public PolicyRateLimitFilter(ReactiveStringRedisTemplate redis, ResilienceProperties properties,
            TrustedClientIpResolver ips, MeterRegistry meters) {
        this.redis = redis; this.properties = properties; this.ips = ips; this.meters = meters;
        script.setLocation(new ClassPathResource("redis/request-limit.lua"));
        script.setResultType(List.class);
        uploadLease.setLocation(new ClassPathResource("redis/upload-lease.lua"));
        uploadLease.setResultType(Long.class);
    }
    public int getOrder() { return -10; }
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (!properties.isRateLimitEnabled() || HttpMethod.OPTIONS.equals(exchange.getRequest().getMethod()))
            return chain.filter(exchange);
        Route route = exchange.getAttribute(GATEWAY_ROUTE_ATTR);
        String policy = String.valueOf(route.getMetadata().getOrDefault("policy", "read"));
        return exchange.getPrincipal().map(principal -> {
                    String selected = policy;
                    String identity = "ip:" + ips.resolve(exchange);
                    if (principal instanceof JwtAuthenticationToken jwt) {
                        identity = "user:" + jwt.getToken().getSubject();
                        var roles = jwt.getToken().getClaimAsStringList("roles");
                        if ("read".equals(policy) && roles != null && roles.contains("ADMIN")) selected = "admin";
                    }
                    return new QuotaIdentity(selected, identity);
                }).defaultIfEmpty(new QuotaIdentity(policy, "ip:" + ips.resolve(exchange)))
                .flatMap(subject -> check(subject.policy(), subject.identity(), exchange).then(Mono.defer(() -> {
                    if (!"upload".equals(policy)) return chain.filter(exchange);
                    String key = "driverapp:upload:" + digest(subject.identity());
                    String permit = java.util.UUID.randomUUID().toString();
                    Mono<String> acquire = redis.execute(uploadLease, List.of(key), List.of(permit, "2"))
                            .single().onErrorMap(ex -> new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Upload quota unavailable", ex))
                            .flatMap(allowed -> allowed == 1 ? Mono.just(permit)
                                    : Mono.error(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Too many active uploads")));
                    return Mono.usingWhen(acquire, ignored -> chain.filter(exchange),
                            ignored -> release(key, permit), (ignored, error) -> release(key, permit), ignored -> release(key, permit));
                })));
    }
    private record QuotaIdentity(String policy, String identity) { }

    private Mono<Void> release(String key, String permit) {
        return redis.opsForZSet().remove(key, permit).then().onErrorResume(ex -> {
            // Lease expiry bounds leakage if Redis disappears during cleanup.
            meters.counter("gateway.upload.release.errors").increment();
            return Mono.empty();
        });
    }
    public Mono<Void> check(String group, String identity, ServerWebExchange exchange) {
        var p = properties.policy(group);
        return redis.execute(script, List.of("driverapp:gateway:" + group + ":" + digest(identity)),
                        List.of(String.valueOf(p.getRate()), String.valueOf(p.getBurst()), String.valueOf(p.getWindowSeconds())))
                .single().onErrorMap(ex -> {
                    meters.counter("gateway.quota.redis.errors", "policy", group).increment();
                    return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Request quota service unavailable", ex);
                }).flatMap(result -> {
                    if (((Number) result.get(0)).longValue() == 1) return Mono.<Void>empty();
                    long seconds = Math.max(1, (((Number)result.get(1)).longValue() + 999) / 1000);
                    exchange.getResponse().getHeaders().set("Retry-After", String.valueOf(seconds));
                    meters.counter("gateway.quota.rejected", "policy", group).increment();
                    return Mono.error(new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Request limit exceeded"));
                });
    }
    private static String digest(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
}
