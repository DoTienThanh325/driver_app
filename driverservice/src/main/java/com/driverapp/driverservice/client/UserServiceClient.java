package com.driverapp.driverservice.client;

import com.driverapp.driverservice.dto.response.UserInfoResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import com.driverapp.driverservice.config.HttpClientConfig;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;
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
     * Grant role to user via User Service (endpoint /api/users/{userId}/roles).
     * Throws exception on failure to trigger transaction rollback.
     */
    public void grantRole(UUID userId, String roleCode) {
        restClient.post()
                .uri("/api/users/{userId}/roles", userId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("roleCode", roleCode))
                .retrieve()
                .toBodilessEntity();
        log.info("Successfully granted role {} to userId={}", roleCode, userId);
    }

    /**
     * Get user info (username, phoneNumber) from User Service.
     */
    public UserInfoResponse getUserInfo(UUID userId) {
        return restClient.get()
                .uri("/api/users/{userId}", userId)
                .retrieve()
                .body(UserInfoResponse.class);
    }
}
