package com.driverapp.notificationservice.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    public static final String USER_ID_ATTR = "userId";
    private final JwtDecoder jwtDecoder;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        String token = extractToken(request);
        if (token != null && !token.isBlank()) {
            try {
                Jwt jwt = jwtDecoder.decode(token);
                String userId = jwt.getSubject();
                if (userId != null && !userId.isBlank()) {
                    attributes.put(USER_ID_ATTR, userId);
                    log.debug("[WS Handshake] Authenticated user {} via token", userId);
                    return true;
                }
            } catch (JwtException ex) {
                log.warn("[WS Handshake] Invalid JWT token: {}", ex.getMessage());
                response.setStatusCode(HttpStatus.UNAUTHORIZED);
                return false;
            }
        }

        // Cho phép đi tiếp nếu handshake không mang token nhưng client có thể gửi token trong STOMP CONNECT frame
        // WebSocketAuthChannelInterceptor sẽ chặn nếu STOMP CONNECT cũng không xác thực được
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // No-op
    }

    private String extractToken(ServerHttpRequest request) {
        // 1. Kiểm tra Authorization header
        List<String> authHeaders = request.getHeaders().get("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String bearer = authHeaders.get(0);
            if (bearer.startsWith("Bearer ")) {
                return bearer.substring(7).trim();
            }
        }

        // 2. Kiểm tra Query parameters (?token=... hoặc ?access_token=...)
        URI uri = request.getURI();
        String query = uri.getQuery();
        if (query == null || query.isBlank()) {
            return null;
        }

        return Arrays.stream(query.split("&"))
                .filter(param -> param.startsWith("token=") || param.startsWith("access_token="))
                .map(param -> {
                    int eqIndex = param.indexOf('=');
                    return eqIndex != -1 ? param.substring(eqIndex + 1) : "";
                })
                .filter(t -> !t.isBlank())
                .findFirst()
                .orElse(null);
    }
}
