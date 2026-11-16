package com.driverapp.apigateway.filter;

import com.driverapp.apigateway.config.ResilienceProperties;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.server.*;
import reactor.core.publisher.Mono;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class PreAuthenticationRateLimitWebFilter implements WebFilter {
    private final PolicyRateLimitFilter limiter;
    private final TrustedClientIpResolver ips;
    private final ResilienceProperties properties;
    public PreAuthenticationRateLimitWebFilter(PolicyRateLimitFilter limiter, TrustedClientIpResolver ips, ResilienceProperties properties) {
        this.limiter = limiter; this.ips = ips; this.properties = properties;
    }
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        if (!properties.isRateLimitEnabled() || HttpMethod.OPTIONS.equals(exchange.getRequest().getMethod())
                || path.startsWith("/actuator/")) return chain.filter(exchange);
        String group = "ingress";
        if (path.endsWith("/auth/login")) group = "login";
        else if (path.endsWith("/auth/register") || path.endsWith("/auth/resend-otp")) group = "otp";
        else if (path.endsWith("/auth/verify-otp")) group = "verify";
        else if (path.endsWith("/auth/refresh")) group = "refresh";
        return limiter.check(group, "ip:" + ips.resolve(exchange), exchange).then(Mono.defer(() -> chain.filter(exchange)));
    }
}
