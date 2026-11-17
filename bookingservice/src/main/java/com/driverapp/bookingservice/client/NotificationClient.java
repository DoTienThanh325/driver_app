package com.driverapp.bookingservice.client;

import com.driverapp.bookingservice.dto.request.CreateNotificationRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import com.driverapp.bookingservice.config.HttpClientConfig;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
public class NotificationClient {

    private final RestClient restClient;

    public NotificationClient(
            HttpClientConfig httpClients,
            @Value("${services.notification.base-url:http://notificationservice}") String baseUrl) {
        this.restClient = httpClients.client("notification", baseUrl, true);
    }

    public void createNotification(CreateNotificationRequest request) {
        restClient.post()
                .uri("/api/notifications")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .toBodilessEntity();
    }
}
