package com.driverapp.feedbackservice.client;

import com.driverapp.feedbackservice.dto.response.UserInfoResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import com.driverapp.feedbackservice.config.HttpClientConfig;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Slf4j
@Component
public class UserServiceClient {

    private final RestClient restClient;

    public UserServiceClient(
            HttpClientConfig httpClients,
            @Value("${services.user.base-url:http://userservice}") String baseUrl) {
        this.restClient = httpClients.client("user", baseUrl, true);
    }

    /**
     * Lấy thông tin user (username, phoneNumber) từ userservice.
     */
    public UserInfoResponse getUserInfo(UUID userId) {
        return restClient.get()
                .uri("/api/users/{userId}", userId)
                .retrieve()
                .body(UserInfoResponse.class);
    }
}
