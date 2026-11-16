package com.driverapp.apigateway.config;

import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.micrometer.tagged.TaggedCircuitBreakerMetrics;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Duration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.gateway.config.HttpClientCustomizer;
import org.springframework.context.annotation.*;

@Configuration
@EnableConfigurationProperties(ResilienceProperties.class)
public class CircuitBreakerConfig {
    @Bean
    CircuitBreakerRegistry gatewayBreakers(MeterRegistry meters, ResilienceProperties properties) {
        if (properties.getMinimumCalls() > properties.getWindow()) throw new IllegalArgumentException("minimum-calls exceeds window");
        for (String group : new String[]{"ingress", "login", "otp", "verify", "refresh", "auth", "jwks", "read", "search", "write", "location", "upload", "admin"}) properties.policy(group);
        var config = io.github.resilience4j.circuitbreaker.CircuitBreakerConfig.custom()
                .slidingWindowSize(properties.getWindow()).minimumNumberOfCalls(properties.getMinimumCalls()).failureRateThreshold(50)
                .slowCallRateThreshold(60).slowCallDurationThreshold(Duration.ofSeconds(3))
                .waitDurationInOpenState(properties.getOpenWait()).permittedNumberOfCallsInHalfOpenState(5)
                .maxWaitDurationInHalfOpenState(Duration.ofSeconds(10)).build();
        var registry = CircuitBreakerRegistry.of(config);
        TaggedCircuitBreakerMetrics.ofCircuitBreakerRegistry(registry).bindTo(meters);
        return registry;
    }
    @Bean
    HttpClientCustomizer noTransportRetry() { return client -> client.disableRetry(true); }
}
