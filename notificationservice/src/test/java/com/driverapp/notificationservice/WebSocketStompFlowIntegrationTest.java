package com.driverapp.notificationservice;

import com.driverapp.notificationservice.config.JwtHandshakeInterceptor;
import com.driverapp.notificationservice.config.SecurityConfig;
import com.driverapp.notificationservice.config.WebSocketAuthChannelInterceptor;
import com.driverapp.notificationservice.config.WebSocketConfig;
import com.driverapp.notificationservice.dto.request.CreateNotificationRequest;
import com.driverapp.notificationservice.event.TripEventPayload;
import com.driverapp.notificationservice.models.Notification;
import com.driverapp.notificationservice.repository.NotificationRepository;
import com.driverapp.notificationservice.service.NotificationService;
import com.driverapp.notificationservice.service.impl.NotificationServiceImpl;
import com.driverapp.notificationservice.websocket.WebSocketEventListener;
import com.driverapp.notificationservice.websocket.WebSocketNotificationPusher;
import com.driverapp.notificationservice.websocket.WebSocketSessionRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@SpringBootTest(
        classes = WebSocketStompFlowIntegrationTest.TestConfig.class,
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "eureka.client.enabled=false",
                "spring.cloud.discovery.enabled=false",
                "spring.flyway.enabled=false"
        }
)
class WebSocketStompFlowIntegrationTest {

    @SpringBootConfiguration
    @EnableAutoConfiguration(excludeName = {
            "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration",
            "org.springframework.boot.hibernate.jpa.autoconfigure.HibernateJpaAutoConfiguration",
            "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration",
            "org.springframework.boot.amqp.autoconfigure.RabbitAutoConfiguration"
    })
    @Import({
            WebSocketConfig.class,
            SecurityConfig.class,
            JwtHandshakeInterceptor.class,
            WebSocketAuthChannelInterceptor.class,
            WebSocketEventListener.class,
            WebSocketSessionRegistry.class,
            WebSocketNotificationPusher.class,
            NotificationServiceImpl.class
    })
    static class TestConfig {
        @Bean
        SimpleMeterRegistry simpleMeterRegistry() {
            return new SimpleMeterRegistry();
        }
    }

    @LocalServerPort
    private int port;

    @MockitoBean
    private NotificationRepository notificationRepository;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private WebSocketSessionRegistry sessionRegistry;

    private WebSocketStompClient stompClient;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        stompClient = new WebSocketStompClient(new StandardWebSocketClient());

        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            return Notification.builder()
                    .id(UUID.randomUUID())
                    .title(n.getTitle())
                    .content(n.getContent())
                    .userId(n.getUserId())
                    .build();
        });
    }

    @AfterEach
    void tearDown() {
        if (stompClient != null) {
            stompClient.stop();
        }
    }

    // Kịch bản 1: Client kết nối bằng query param ?token=... -> subscribe /user/queue/notifications -> nhận realtime -> disconnect
    @Test
    void queryTokenHandshake_subscribesAndReceivesRealtimeTripNotification() throws Exception {
        when(jwtDecoder.decode("valid-query-token")).thenReturn(jwtFor(userId));

        String url = "ws://localhost:" + port + "/ws/notifications?token=valid-query-token";
        BlockingQueue<String> receivedPayloads = new LinkedBlockingQueue<>();

        StompSession session = stompClient.connectAsync(url, new StompSessionHandlerAdapter() {})
                .get(5, TimeUnit.SECONDS);
        assertTrue(session.isConnected());
        assertTrue(waitUntil(() -> sessionRegistry.isOnline(userId.toString()), 2000));

        session.subscribe("/user/queue/notifications", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return byte[].class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                receivedPayloads.add(new String((byte[]) payload, StandardCharsets.UTF_8));
            }
        });

        // Cho broker kịp xử lý SUBSCRIBE frame
        Thread.sleep(200);

        notificationService.createTripNotification(
                new CreateNotificationRequest("Tài xế đã nhận chuyến", "Xe đang đến đón bạn", userId),
                TripEventPayload.builder()
                        .tripId("trip-ws-01")
                        .tripStatus("DRIVER_ASSIGNED")
                        .pickupAddress("123 Lê Lợi")
                        .dropoffAddress("456 Nguyễn Huệ")
                        .build()
        );

        String messageJson = receivedPayloads.poll(5, TimeUnit.SECONDS);
        assertNotNull(messageJson, "Phải nhận được NotificationMessage qua WebSocket");
        assertTrue(messageJson.contains("TRIP_DRIVER_ASSIGNED"));
        assertTrue(messageJson.contains("trip-ws-01"));
        assertTrue(messageJson.contains("Tài xế đã nhận chuyến"));

        session.disconnect();
        assertTrue(waitUntil(() -> !sessionRegistry.isOnline(userId.toString()), 2000));
    }

    // Kịch bản 2: Handshake không mang token -> xác thực qua STOMP CONNECT native header Authorization -> nhận thông báo GENERAL
    @Test
    void stompConnectHeaderAuth_receivesGeneralNotification() throws Exception {
        when(jwtDecoder.decode("valid-stomp-token")).thenReturn(jwtFor(userId));

        String url = "ws://localhost:" + port + "/ws/notifications";
        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer valid-stomp-token");

        BlockingQueue<String> receivedPayloads = new LinkedBlockingQueue<>();
        StompSession session = stompClient.connectAsync(
                url,
                new WebSocketHttpHeaders(),
                connectHeaders,
                new StompSessionHandlerAdapter() {}
        ).get(5, TimeUnit.SECONDS);

        assertTrue(session.isConnected());
        assertTrue(waitUntil(() -> sessionRegistry.isOnline(userId.toString()), 2000));

        session.subscribe("/user/queue/notifications", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return byte[].class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                receivedPayloads.add(new String((byte[]) payload, StandardCharsets.UTF_8));
            }
        });

        Thread.sleep(200);

        notificationService.createNotification(
                new CreateNotificationRequest("Khuyến mãi mới", "Bạn nhận được mã giảm giá", userId)
        );

        String messageJson = receivedPayloads.poll(5, TimeUnit.SECONDS);
        assertNotNull(messageJson);
        assertTrue(messageJson.contains("GENERAL"));
        assertTrue(messageJson.contains("Khuyến mãi mới"));

        session.disconnect();
    }

    // Kịch bản 3: Từ chối kết nối khi token handshake sai hoặc thiếu token ở cả handshake lẫn STOMP CONNECT
    @Test
    void rejectsUnauthorizedConnectionsAtHandshakeAndStompConnect() {
        when(jwtDecoder.decode("bad-token")).thenThrow(new JwtException("Invalid JWT"));

        // 3a. Sai token ngay ở HTTP handshake -> bị từ chối kết nối
        String badHandshakeUrl = "ws://localhost:" + port + "/ws/notifications?token=bad-token";
        assertThrows(ExecutionException.class, () ->
                stompClient.connectAsync(badHandshakeUrl, new StompSessionHandlerAdapter() {})
                        .get(5, TimeUnit.SECONDS)
        );

        // 3b. Không có token ở handshake và không gửi token ở STOMP CONNECT -> bị WebSocketAuthChannelInterceptor chặn
        String noTokenUrl = "ws://localhost:" + port + "/ws/notifications";
        assertThrows(Exception.class, () ->
                stompClient.connectAsync(noTokenUrl, new StompSessionHandlerAdapter() {})
                        .get(5, TimeUnit.SECONDS)
        );
        assertFalse(sessionRegistry.isOnline(userId.toString()));
    }

    private Jwt jwtFor(UUID subject) {
        return Jwt.withTokenValue("mock-jwt")
                .header("alg", "none")
                .subject(subject.toString())
                .build();
    }

    private boolean waitUntil(java.util.function.BooleanSupplier condition, long timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if (condition.getAsBoolean()) {
                return true;
            }
            Thread.sleep(50);
        }
        return condition.getAsBoolean();
    }
}
