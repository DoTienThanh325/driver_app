package com.driverapp.driverservice.client;

import java.util.Map;
import java.util.UUID;

import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class NotificationClient {

    private final RestClient loadBalancedRestClient;
    private final RestClient directRestClient;

    public NotificationClient(@LoadBalanced RestClient.Builder restClientBuilder) {
        this.loadBalancedRestClient = restClientBuilder.baseUrl("http://notificationservice").build();
        this.directRestClient = RestClient.builder().baseUrl("http://localhost:8086").build();
    }

    public void sendNotification(UUID userId, String title, String content) {
        log.info("Sending notification to userId {}: {}", userId, title);
        Map<String, Object> request = Map.of(
                "userId", userId,
                "title", title,
                "content", content
        );

        try {
            loadBalancedRestClient.post()
                    .uri("/internal/notifications")
                    .body(request)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Successfully sent notification to userId {} via Eureka LoadBalancer", userId);
        } catch (Exception e) {
            log.warn("LoadBalanced call to notificationservice failed ({}), falling back to direct URL http://localhost:8086", e.getMessage());
            try {
                directRestClient.post()
                        .uri("/internal/notifications")
                        .body(request)
                        .retrieve()
                        .toBodilessEntity();
                log.info("Successfully sent notification to userId {} via direct fallback URL", userId);
            } catch (Exception ex) {
                log.error("Failed to send notification to userId {}: {}", userId, ex.getMessage());
            }
        }
    }
}
