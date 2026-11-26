package com.driverapp.notificationservice;

import com.driverapp.notificationservice.config.JwtHandshakeInterceptor;
import com.driverapp.notificationservice.config.WebSocketAuthChannelInterceptor;
import com.driverapp.notificationservice.dto.request.CreateNotificationRequest;
import com.driverapp.notificationservice.dto.websocket.NotificationMessage;
import com.driverapp.notificationservice.models.Notification;
import com.driverapp.notificationservice.repository.NotificationRepository;
import com.driverapp.notificationservice.service.impl.NotificationServiceImpl;
import com.driverapp.notificationservice.websocket.StompPrincipal;
import com.driverapp.notificationservice.websocket.WebSocketEventListener;
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
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WebSocketLifecycleScenariosTest {

    @Mock
    private JwtDecoder jwtDecoder;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private SimpMessagingTemplate messagingTemplate;
    @Mock
    private MessageChannel messageChannel;
    @Mock
    private ServerHttpRequest httpRequest;
    @Mock
    private ServerHttpResponse httpResponse;

    private WebSocketSessionRegistry sessionRegistry;
    private SimpleMeterRegistry meterRegistry;
    private WebSocketNotificationPusher notificationPusher;
    private NotificationServiceImpl notificationService;
    private JwtHandshakeInterceptor handshakeInterceptor;
    private WebSocketAuthChannelInterceptor authChannelInterceptor;
    private WebSocketEventListener eventListener;

    @BeforeEach
    void setUp() {
        sessionRegistry = new WebSocketSessionRegistry();
        meterRegistry = new SimpleMeterRegistry();
        notificationPusher = new WebSocketNotificationPusher(messagingTemplate, sessionRegistry, meterRegistry);
        notificationService = new NotificationServiceImpl(notificationRepository, notificationPusher);
        handshakeInterceptor = new JwtHandshakeInterceptor(jwtDecoder);
        authChannelInterceptor = new WebSocketAuthChannelInterceptor(jwtDecoder);
        eventListener = new WebSocketEventListener(sessionRegistry);
    }

    // Kịch bản 1: Vòng đời đa thiết bị (Multi-session) qua WebSocketEventListener
    @Test
    void multiDeviceLifecycle_connectsAndDisconnectsGracefully() {
        UUID userId = UUID.randomUUID();
        StompPrincipal principal = new StompPrincipal(userId.toString());

        // Thiết bị 1 và 2 kết nối
        eventListener.handleSessionConnected(connectedEvent(principal, "sess-mobile"));
        eventListener.handleSessionConnected(connectedEvent(principal, "sess-web"));

        assertTrue(sessionRegistry.isOnline(userId.toString()));
        assertEquals(1, sessionRegistry.onlineCount());
        assertEquals(2, sessionRegistry.totalSessionCount());

        // Thiết bị 1 ngắt kết nối -> user vẫn online qua thiết bị 2
        eventListener.handleSessionDisconnect(disconnectEvent(principal, "sess-mobile"));
        assertTrue(sessionRegistry.isOnline(userId.toString()));
        assertEquals(1, sessionRegistry.totalSessionCount());

        // Thiết bị 2 ngắt kết nối -> user offline hoàn toàn
        eventListener.handleSessionDisconnect(disconnectEvent(principal, "sess-web"));
        assertFalse(sessionRegistry.isOnline(userId.toString()));
        assertEquals(0, sessionRegistry.onlineCount());

        // Push khi offline -> trả về false và ghi nhận metric offline
        boolean pushed = notificationPusher.pushToUser(userId, NotificationMessage.general(
                Notification.builder().id(UUID.randomUUID()).title("T").content("C").userId(userId).build()
        ));
        assertFalse(pushed);
        assertEquals(1.0, meterRegistry.counter("ws.notification.offline").count());
    }

    // Kịch bản 2: Xác thực đa nguồn qua Handshake (Bearer header / access_token) và STOMP CONNECT (token header / từ chối)
    @Test
    void authInterceptors_supportAllTokenSourcesAndRejectInvalidStompConnect() {
        UUID userId = UUID.randomUUID();
        Jwt validJwt = Jwt.withTokenValue("tok").header("alg", "none").subject(userId.toString()).build();
        when(jwtDecoder.decode("header-token")).thenReturn(validJwt);
        when(jwtDecoder.decode("query-access-token")).thenReturn(validJwt);
        when(jwtDecoder.decode("stomp-native-token")).thenReturn(validJwt);
        when(jwtDecoder.decode("bad-stomp-token")).thenThrow(new JwtException("Expired"));

        // 2a. Handshake qua Authorization: Bearer header
        HttpHeaders bearerHeaders = new HttpHeaders();
        bearerHeaders.add("Authorization", "Bearer header-token");
        when(httpRequest.getHeaders()).thenReturn(bearerHeaders);
        Map<String, Object> attrs1 = new HashMap<>();
        assertTrue(handshakeInterceptor.beforeHandshake(httpRequest, httpResponse, null, attrs1));
        assertEquals(userId.toString(), attrs1.get(JwtHandshakeInterceptor.USER_ID_ATTR));

        // 2b. Handshake qua ?access_token=...
        when(httpRequest.getHeaders()).thenReturn(new HttpHeaders());
        when(httpRequest.getURI()).thenReturn(URI.create("ws://localhost:8086/ws/notifications?access_token=query-access-token"));
        Map<String, Object> attrs2 = new HashMap<>();
        assertTrue(handshakeInterceptor.beforeHandshake(httpRequest, httpResponse, null, attrs2));
        assertEquals(userId.toString(), attrs2.get(JwtHandshakeInterceptor.USER_ID_ATTR));

        // 2c. STOMP CONNECT dùng lại userId từ sessionAttributes của handshake
        Message<?> connectFromHandshake = stompConnectMessage(attrs1, null, null);
        Message<?> passed = authChannelInterceptor.preSend(connectFromHandshake, messageChannel);
        StompHeaderAccessor passedAccessor = StompHeaderAccessor.wrap(passed);
        assertEquals(userId.toString(), passedAccessor.getUser().getName());

        // 2d. STOMP CONNECT dùng native header `token` khi handshake không mang token
        Map<String, Object> emptyAttrs = new HashMap<>();
        Message<?> connectWithTokenHeader = stompConnectMessage(emptyAttrs, null, "stomp-native-token");
        Message<?> passedNative = authChannelInterceptor.preSend(connectWithTokenHeader, messageChannel);
        assertEquals(userId.toString(), StompHeaderAccessor.wrap(passedNative).getUser().getName());
        assertEquals(userId.toString(), emptyAttrs.get(JwtHandshakeInterceptor.USER_ID_ATTR));

        // 2e. STOMP CONNECT không có token -> ném AccessDeniedException
        assertThrows(AccessDeniedException.class, () ->
                authChannelInterceptor.preSend(stompConnectMessage(new HashMap<>(), null, null), messageChannel));

        // 2f. STOMP CONNECT token sai -> ném AccessDeniedException
        assertThrows(AccessDeniedException.class, () ->
                authChannelInterceptor.preSend(stompConnectMessage(new HashMap<>(), "Bearer bad-stomp-token", null), messageChannel));
    }

    // Kịch bản 3: Best-effort push — lỗi SimpMessagingTemplate không làm gián đoạn việc lưu thông báo
    @Test
    void pushFailureResilience_savesNotificationEvenWhenWebSocketSendFails() {
        UUID userId = UUID.randomUUID();
        sessionRegistry.register(userId.toString(), "sess-active");

        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            return Notification.builder()
                    .id(UUID.randomUUID())
                    .title(n.getTitle())
                    .content(n.getContent())
                    .userId(n.getUserId())
                    .build();
        });
        doThrow(new RuntimeException("Broker unavailable"))
                .when(messagingTemplate).convertAndSendToUser(anyString(), anyString(), any());

        Notification saved = notificationService.createNotification(
                new CreateNotificationRequest("Cảnh báo", "Nội dung quan trọng", userId)
        );

        assertNotNull(saved);
        assertEquals("Cảnh báo", saved.getTitle());
        verify(notificationRepository, times(1)).save(any(Notification.class));
        assertEquals(1.0, meterRegistry.counter("ws.notification.push.errors").count());
    }

    private SessionConnectedEvent connectedEvent(StompPrincipal principal, String sessionId) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECTED);
        accessor.setUser(principal);
        accessor.setSessionId(sessionId);
        return new SessionConnectedEvent(this, MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders()));
    }

    private SessionDisconnectEvent disconnectEvent(StompPrincipal principal, String sessionId) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.DISCONNECT);
        accessor.setUser(principal);
        accessor.setSessionId(sessionId);
        return new SessionDisconnectEvent(
                this,
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders()),
                sessionId,
                CloseStatus.NORMAL
        );
    }

    private Message<byte[]> stompConnectMessage(Map<String, Object> sessionAttrs, String authHeader, String tokenHeader) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setSessionAttributes(sessionAttrs);
        accessor.setLeaveMutable(true);
        if (authHeader != null) {
            accessor.setNativeHeader("Authorization", authHeader);
        }
        if (tokenHeader != null) {
            accessor.setNativeHeader("token", tokenHeader);
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
