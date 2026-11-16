package com.driverapp.feedbackservice.config;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("resilience.http")
public class OutboundHttpProperties {
    private boolean enabled = true;
    private final Map<String, Policy> clients = new HashMap<>();
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean value) { enabled = value; }
    public Map<String, Policy> getClients() { return clients; }
    public Policy policy(String name) { return clients.getOrDefault(name, new Policy()); }

    public static class Policy {
        private Duration total = Duration.ofMillis(1500);
        public Duration getTotal() { return total; }
        public void setTotal(Duration value) { total = positive(value); }
        private Duration connect = Duration.ofMillis(300);
        private Duration read = Duration.ofSeconds(1);
        private Duration poolWait = Duration.ofMillis(200);
        private Duration slow = Duration.ofMillis(800);
        private Duration openWait = Duration.ofSeconds(15);
        private int concurrency = 50;
        private int minimumCalls = 20;
        private int window = 50;
        public Duration getConnect() { return connect; }
        public void setConnect(Duration value) { connect = positive(value); }
        public Duration getRead() { return read; }
        public void setRead(Duration value) { read = positive(value); }
        public Duration getPoolWait() { return poolWait; }
        public void setPoolWait(Duration value) { poolWait = positive(value); }
        public Duration getSlow() { return slow; }
        public void setSlow(Duration value) { slow = positive(value); }
        public Duration getOpenWait() { return openWait; }
        public void setOpenWait(Duration value) { openWait = positive(value); }
        public int getConcurrency() { return concurrency; }
        public void setConcurrency(int value) { concurrency = positive(value); }
        public int getMinimumCalls() { return minimumCalls; }
        public void setMinimumCalls(int value) { minimumCalls = positive(value); }
        public int getWindow() { return window; }
        public void setWindow(int value) { window = positive(value); }
        private static Duration positive(Duration v) {
            if (v == null || v.isZero() || v.isNegative()) throw new IllegalArgumentException("HTTP duration must be positive");
            return v;
        }
        private static int positive(int v) {
            if (v < 1) throw new IllegalArgumentException("HTTP limit must be positive");
            return v;
        }
    }
}
