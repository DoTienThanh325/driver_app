package com.driverapp.userservice.config;

import java.util.*;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties("resilience.auth")
public class RateLimitProperties {
    private boolean enabled = true;
    private boolean exposeOtp = false;
    private final Map<String, Policy> policies = new HashMap<>();
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean v) { enabled = v; }
    public boolean isExposeOtp() { return exposeOtp; }
    public void setExposeOtp(boolean v) { exposeOtp = v; }
    public Map<String, Policy> getPolicies() { return policies; }
    public Policy policy(String name) {
        var policy = policies.get(name);
        if (policy == null) throw new IllegalArgumentException("Missing auth quota: " + name);
        return policy;
    }
    public static class Policy {
        private int limit;
        private int seconds;
        public int getLimit() { return limit; }
        public void setLimit(int v) { if (v < 1) throw new IllegalArgumentException("limit must be positive"); limit = v; }
        public int getSeconds() { return seconds; }
        public void setSeconds(int v) { if (v < 1) throw new IllegalArgumentException("seconds must be positive"); seconds = v; }
    }
}
