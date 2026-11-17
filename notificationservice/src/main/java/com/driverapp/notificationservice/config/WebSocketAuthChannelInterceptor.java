package com.driverapp.notificationservice.config;

import com.driverapp.notificationservice.websocket.StompPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtDecoder jwtDecoder;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String userId = null;

            // 1. Kiểm tra session attributes từ HTTP handshake
            Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
            if (sessionAttributes != null) {
                Object val = sessionAttributes.get(JwtHandshakeInterceptor.USER_ID_ATTR);
                if (val instanceof String s && !s.isBlank()) {
                    userId = s;
                }
            }

            // 2. Nếu handshake không có, kiểm tra native headers trong STOMP CONNECT frame
            if (userId == null) {
                String token = extractTokenFromStompHeaders(accessor);
                if (token != null) {
                    try {
                        Jwt jwt = jwtDecoder.decode(token);
                        userId = jwt.getSubject();
                        if (sessionAttributes != null) {
                            sessionAttributes.put(JwtHandshakeInterceptor.USER_ID_ATTR, userId);
                        }
                    } catch (JwtException ex) {
                        log.warn("[WS STOMP CONNECT] Invalid token from native header: {}", ex.getMessage());
                        throw new AccessDeniedException("Invalid JWT token for WebSocket connection");
                    }
                }
            }

            // 3. Nếu vẫn không có danh tính -> Chặn kết nối
            if (userId == null || userId.isBlank()) {
                log.warn("[WS STOMP CONNECT] Rejected unauthenticated connection attempt");
                throw new AccessDeniedException("Authentication required for WebSocket connection");
            }

            accessor.setUser(new StompPrincipal(userId));
            log.info("[WS STOMP CONNECT] User authenticated: {}", userId);
        }

        return message;
    }

    private String extractTokenFromStompHeaders(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }
        String tokenHeader = accessor.getFirstNativeHeader("token");
        if (tokenHeader != null && !tokenHeader.isBlank()) {
            return tokenHeader.trim();
        }
        return null;
    }
}
