package com.driverapp.notificationservice.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;
    private final WebSocketAuthChannelInterceptor authChannelInterceptor;

    @Value("${websocket.allowed-origins:*}")
    private String allowedOrigins;

    @Value("${websocket.message-size-limit:65536}")
    private int messageSizeLimit;

    @Value("${websocket.send-buffer-size:524288}")
    private int sendBufferSizeLimit;

    @Value("${websocket.send-time-limit:15000}")
    private int sendTimeLimit;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Simple in-memory broker cho các prefix /queue (user-specific) và /topic (broadcast nếu cần)
        config.enableSimpleBroker("/queue", "/topic");
        config.setApplicationDestinationPrefixes("/app");
        // Prefix cho destination cá nhân: /user/{userId}/queue/notifications
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = allowedOrigins.split(",");

        // 1. Endpoint STOMP hỗ trợ SockJS fallback (cho Web Client)
        registry.addEndpoint("/ws/notifications")
                .setAllowedOriginPatterns(origins)
                .addInterceptors(jwtHandshakeInterceptor)
                .withSockJS()
                .setHeartbeatTime(25_000);

        // 2. Endpoint STOMP thuần WebSocket (cho Mobile Client: Android OkHttp / iOS / Flutter)
        registry.addEndpoint("/ws/notifications")
                .setAllowedOriginPatterns(origins)
                .addInterceptors(jwtHandshakeInterceptor);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Gắn interceptor xác thực STOMP CONNECT frame và gán Principal
        registration.interceptors(authChannelInterceptor);
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.setMessageSizeLimit(messageSizeLimit)
                .setSendBufferSizeLimit(sendBufferSizeLimit)
                .setSendTimeLimit(sendTimeLimit);
    }
}
