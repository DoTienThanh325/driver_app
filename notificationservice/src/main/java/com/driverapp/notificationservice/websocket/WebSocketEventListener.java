package com.driverapp.notificationservice.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final WebSocketSessionRegistry sessionRegistry;

    @EventListener
    public void handleSessionConnected(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();
        String sessionId = accessor.getSessionId();

        if (principal != null && sessionId != null) {
            String userId = principal.getName();
            sessionRegistry.register(userId, sessionId);
            log.info("[WS] Client connected: userId={}, sessionId={}, totalOnlineUsers={}",
                    userId, sessionId, sessionRegistry.onlineCount());
        } else {
            log.debug("[WS] Unauthenticated connection established: sessionId={}", sessionId);
        }
    }

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();
        String sessionId = accessor.getSessionId();

        if (sessionId != null) {
            if (principal != null) {
                sessionRegistry.unregister(principal.getName(), sessionId);
            } else {
                sessionRegistry.unregister(sessionId);
            }
            log.info("[WS] Client disconnected: user={}, sessionId={}, remainingOnlineUsers={}",
                    principal != null ? principal.getName() : "unknown", sessionId, sessionRegistry.onlineCount());
        }
    }
}
