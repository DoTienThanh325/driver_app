package com.driverapp.apigateway.filter;

import com.driverapp.apigateway.config.ResilienceProperties;
import java.net.InetAddress;
import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;

@Component
public class TrustedClientIpResolver {
    private final List<String> trusted;
    public TrustedClientIpResolver(ResilienceProperties properties) {
        trusted = List.copyOf(properties.getTrustedProxies());
    }
    public String resolve(ServerWebExchange exchange) {
        var address = exchange.getRequest().getRemoteAddress();
        String peer = address == null ? "unknown" : address.getAddress().getHostAddress();
        if (!isTrusted(peer)) return peer;
        String forwarded = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
        if (forwarded == null || forwarded.length() > 2048) return peer;
        String[] hops = forwarded.split(",");
        // Walk from the nearest proxy, stopping at the first untrusted hop.
        for (int i = hops.length - 1; i >= 0 && isTrusted(peer); i--) {
            String candidate = hops[i].trim();
            if (!candidate.matches("[0-9a-fA-F:.]+")) return peer;
            try { peer = InetAddress.getByName(candidate).getHostAddress(); }
            catch (Exception invalid) { return peer; }
        }
        return peer;
    }
    private static boolean matches(String cidr, String ip) {
        try {
            String[] parts = cidr.split("/", -1);
            byte[] network = InetAddress.getByName(parts[0]).getAddress();
            byte[] address = InetAddress.getByName(ip).getAddress();
            if (network.length != address.length) return false;
            int bits = parts.length == 1 ? network.length * 8 : Integer.parseInt(parts[1]);
            if (bits < 0 || bits > network.length * 8) throw new IllegalArgumentException("Invalid trusted proxy CIDR");
            for (int i = 0; i < network.length; i++) {
                int mask = 0xff << (8 - Math.min(8, Math.max(0, bits - i * 8)));
                if ((network[i] & mask) != (address[i] & mask)) return false;
            }
            return true;
        } catch (Exception invalid) { return false; }
    }
    private boolean isTrusted(String ip) {
        if ("unknown".equals(ip)) return false;
        return trusted.stream().anyMatch(cidr -> matches(cidr, ip));
    }
}
