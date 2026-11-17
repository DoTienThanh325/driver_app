package com.driverapp.apigateway.config;

import java.time.Duration;
import java.util.*;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("resilience.gateway")
public class ResilienceProperties {
    private int minimumCalls = 20;
    private int window = 50;
    private Duration openWait = Duration.ofSeconds(15);
    public int getMinimumCalls() { return minimumCalls; }
    public void setMinimumCalls(int v) { if (v < 1) throw new IllegalArgumentException("minimum-calls must be positive"); minimumCalls = v; }
    public int getWindow() { return window; }
    public void setWindow(int v) { if (v < 1) throw new IllegalArgumentException("window must be positive"); window = v; }
    public Duration getOpenWait() { return openWait; }
    public void setOpenWait(Duration v) { if (v.isNegative() || v.isZero()) throw new IllegalArgumentException("open-wait must be positive"); openWait = v; }
    private boolean rateLimitEnabled = true;
    private boolean circuitBreakerEnabled = true;
    private List<String> trustedProxies = new ArrayList<>();
    private final Map<String, Policy> policies = new HashMap<>();
    public boolean isRateLimitEnabled() { return rateLimitEnabled; }
    public void setRateLimitEnabled(boolean v) { rateLimitEnabled = v; }
    public boolean isCircuitBreakerEnabled() { return circuitBreakerEnabled; }
    public void setCircuitBreakerEnabled(boolean v) { circuitBreakerEnabled = v; }
    public List<String> getTrustedProxies() { return trustedProxies; }
    public void setTrustedProxies(List<String> v) { trustedProxies = v; }
    public Map<String, Policy> getPolicies() { return policies; }
    public Policy policy(String name) {
        Policy p = policies.get(name);
        if (p == null) throw new IllegalArgumentException("Missing gateway policy: " + name);
        return p;
    }
    public static class Policy {
        private Duration slow = Duration.ofSeconds(3);
        public Duration getSlow() { return slow; }
        public void setSlow(Duration v) { if (v.isNegative() || v.isZero()) throw new IllegalArgumentException("slow must be positive"); slow = v; }
        private int rate = 10;
        private int burst = 20;
        private int windowSeconds;
        public int getRate() { return rate; }
        public void setRate(int v) { if(v < 1) throw new IllegalArgumentException("rate must be positive"); rate = v; }
        public int getBurst() { return burst; }
        public void setBurst(int v) { if(v < 1) throw new IllegalArgumentException("burst must be positive"); burst = v; }
        public int getWindowSeconds() { return windowSeconds; }
        public void setWindowSeconds(int v) { if(v < 0) throw new IllegalArgumentException("window must not be negative"); windowSeconds = v; }
    }
}
