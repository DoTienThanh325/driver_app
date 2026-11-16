package com.driverapp.notificationservice.websocket;

import com.driverapp.notificationservice.dto.websocket.NotificationMessage;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tags;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketNotificationPusher {

    private final SimpMessagingTemplate messagingTemplate;
    private final WebSocketSessionRegistry sessionRegistry;
    private final MeterRegistry meterRegistry;

    @PostConstruct
    void initMetrics() {
        meterRegistry.gauge("ws.sessions.active", Tags.empty(), sessionRegistry, WebSocketSessionRegistry::totalSessionCount);
        meterRegistry.gauge("ws.users.online", Tags.empty(), sessionRegistry, WebSocketSessionRegistry::onlineCount);
    }

    /**
     * Push notification tới user qua destination /user/{userId}/queue/notifications.
     * Thao tác push là best-effort: bắt mọi exception để không làm gián đoạn transaction lưu DB.
     */
    public boolean pushToUser(UUID userId, NotificationMessage message) {
        if (userId == null || message == null) {
            return false;
        }
        return pushToUser(userId.toString(), message);
    }

    public boolean pushToUser(String userId, NotificationMessage message) {
        if (userId == null || message == null) {
            return false;
        }

        if (!sessionRegistry.isOnline(userId)) {
            meterRegistry.counter("ws.notification.offline").increment();
            log.debug("[WS] User {} is currently offline; notification not pushed via WebSocket", userId);
            return false;
        }

        try {
            messagingTemplate.convertAndSendToUser(
                    userId,
                    "/queue/notifications",
                    message
            );
            meterRegistry.counter("ws.notification.pushed", "type", message.type()).increment();
            log.info("[WS] Successfully pushed notification to user {}: type={}, id={}",
                    userId, message.type(), message.id());
            return true;
        } catch (Exception ex) {
            meterRegistry.counter("ws.notification.push.errors").increment();
            log.warn("[WS] Failed to push notification to user {}: {}", userId, ex.getMessage(), ex);
            return false;
        }
    }
}
