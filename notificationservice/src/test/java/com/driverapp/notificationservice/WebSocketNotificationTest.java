package com.driverapp.notificationservice;

import com.driverapp.notificationservice.config.JwtHandshakeInterceptor;
import com.driverapp.notificationservice.dto.request.CreateNotificationRequest;
import com.driverapp.notificationservice.dto.websocket.NotificationMessage;
import com.driverapp.notificationservice.event.TripEventPayload;
import com.driverapp.notificationservice.models.Notification;
import com.driverapp.notificationservice.repository.NotificationRepository;
import com.driverapp.notificationservice.service.impl.NotificationServiceImpl;
import com.driverapp.notificationservice.websocket.WebSocketNotificationPusher;
import com.driverapp.notificationservice.websocket.WebSocketSessionRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WebSocketNotificationTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private JwtDecoder jwtDecoder;

    @Mock
    private ServerHttpRequest httpRequest;

    @Mock
    private ServerHttpResponse httpResponse;

    private WebSocketSessionRegistry sessionRegistry;
    private WebSocketNotificationPusher notificationPusher;
    private SimpleMeterRegistry meterRegistry;
    private NotificationServiceImpl notificationService;
    private JwtHandshakeInterceptor handshakeInterceptor;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        sessionRegistry = new WebSocketSessionRegistry();
        notificationPusher = new WebSocketNotificationPusher(messagingTemplate, sessionRegistry, meterRegistry);
        notificationService = new NotificationServiceImpl(notificationRepository, notificationPusher);
        handshakeInterceptor = new JwtHandshakeInterceptor(jwtDecoder);
    }

    @Test
    void testSessionRegistryTracking() {
        String userId = UUID.randomUUID().toString();
        String session1 = "sess-1";
        String session2 = "sess-2";

        assertFalse(sessionRegistry.isOnline(userId));
        assertEquals(0, sessionRegistry.onlineCount());

        sessionRegistry.register(userId, session1);
        assertTrue(sessionRegistry.isOnline(userId));
        assertEquals(1, sessionRegistry.onlineCount());
        assertEquals(1, sessionRegistry.totalSessionCount());

        sessionRegistry.register(userId, session2);
        assertTrue(sessionRegistry.isOnline(userId));
        assertEquals(1, sessionRegistry.onlineCount());
        assertEquals(2, sessionRegistry.totalSessionCount());

        sessionRegistry.unregister(session1);
        assertTrue(sessionRegistry.isOnline(userId));
        assertEquals(1, sessionRegistry.totalSessionCount());

        sessionRegistry.unregister(session2);
        assertFalse(sessionRegistry.isOnline(userId));
        assertEquals(0, sessionRegistry.totalSessionCount());
    }

    @Test
    void testPusherWhenUserOnline() {
        UUID userId = UUID.randomUUID();
        sessionRegistry.register(userId.toString(), "session-abc");

        NotificationMessage message = new NotificationMessage(
                UUID.randomUUID().toString(),
                "TRIP_DRIVER_ASSIGNED",
                "Tài xế đã nhận chuyến",
                "Tài xế Nguyễn Văn A đang đến",
                Map.of("tripId", "trip-123"),
                Instant.now()
        );

        boolean pushed = notificationPusher.pushToUser(userId, message);

        assertTrue(pushed);
        verify(messagingTemplate, times(1)).convertAndSendToUser(
                eq(userId.toString()),
                eq("/queue/notifications"),
                eq(message)
        );
        assertEquals(1.0, meterRegistry.counter("ws.notification.pushed", "type", "TRIP_DRIVER_ASSIGNED").count());
    }

    @Test
    void testPusherWhenUserOffline() {
        UUID userId = UUID.randomUUID();

        NotificationMessage message = new NotificationMessage(
                UUID.randomUUID().toString(),
                "GENERAL",
                "Thông báo",
                "Nội dung",
                Map.of(),
                Instant.now()
        );

        boolean pushed = notificationPusher.pushToUser(userId, message);

        assertFalse(pushed);
        verify(messagingTemplate, never()).convertAndSendToUser(anyString(), anyString(), any());
        assertEquals(1.0, meterRegistry.counter("ws.notification.offline").count());
    }

    @Test
    void testNotificationServiceCreateTripNotification() {
        UUID userId = UUID.randomUUID();
        sessionRegistry.register(userId.toString(), "session-xyz");

        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification n = invocation.getArgument(0);
            return Notification.builder()
                    .id(UUID.randomUUID())
                    .title(n.getTitle())
                    .content(n.getContent())
                    .userId(n.getUserId())
                    .build();
        });

        CreateNotificationRequest req = new CreateNotificationRequest("Cập nhật", "Xe đang đến", userId);
        TripEventPayload tripPayload = TripEventPayload.builder()
                .tripId("trip-999")
                .tripStatus("DRIVER_ASSIGNED")
                .pickupAddress("123 Le Loi")
                .dropoffAddress("456 Nguyen Hue")
                .build();

        Notification result = notificationService.createTripNotification(req, tripPayload);

        assertNotNull(result);
        verify(notificationRepository, times(1)).save(any(Notification.class));
        verify(messagingTemplate, times(1)).convertAndSendToUser(
                eq(userId.toString()),
                eq("/queue/notifications"),
                argThat((NotificationMessage msg) -> "TRIP_DRIVER_ASSIGNED".equals(msg.type())
                        && "trip-999".equals(msg.data().get("tripId")))
        );
    }

    @Test
    void testJwtHandshakeInterceptorSuccess() {
        when(httpRequest.getHeaders()).thenReturn(new HttpHeaders());
        when(httpRequest.getURI()).thenReturn(URI.create("ws://localhost:8086/ws/notifications?token=valid.jwt.token"));

        Jwt mockJwt = mock(Jwt.class);
        when(mockJwt.getSubject()).thenReturn("user-456");
        when(jwtDecoder.decode("valid.jwt.token")).thenReturn(mockJwt);

        Map<String, Object> attributes = new HashMap<>();
        boolean allowed = handshakeInterceptor.beforeHandshake(httpRequest, httpResponse, null, attributes);

        assertTrue(allowed);
        assertEquals("user-456", attributes.get(JwtHandshakeInterceptor.USER_ID_ATTR));
    }

    @Test
    void testJwtHandshakeInterceptorInvalidToken() {
        when(httpRequest.getHeaders()).thenReturn(new HttpHeaders());
        when(httpRequest.getURI()).thenReturn(URI.create("ws://localhost:8086/ws/notifications?token=invalid.jwt.token"));
        when(jwtDecoder.decode("invalid.jwt.token")).thenThrow(new JwtException("Expired token"));

        Map<String, Object> attributes = new HashMap<>();
        boolean allowed = handshakeInterceptor.beforeHandshake(httpRequest, httpResponse, null, attributes);

        assertFalse(allowed);
        assertNull(attributes.get(JwtHandshakeInterceptor.USER_ID_ATTR));
    }
}
