package com.driverapp.bookingservice.client;

import com.driverapp.bookingservice.dto.request.CreateNotificationRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalancerInterceptor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
public class NotificationClient {

    private final RestClient restClient;

    public NotificationClient(
            LoadBalancerInterceptor loadBalancerInterceptor,
            @Value("${services.notification.base-url:http://notificationservice}") String baseUrl) {
        // Tự tạo RestClient riêng và chỉ gắn LoadBalancerInterceptor cho riêng client
        // này
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestInterceptor(loadBalancerInterceptor)
                .build();
    }

    public void createNotification(CreateNotificationRequest request) {
        try {
            restClient.post()
                    .uri("/api/notifications")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("Không thể tạo notification cho userId={}: {}",
                    request.userId(), e.getMessage());
        }
    }
}