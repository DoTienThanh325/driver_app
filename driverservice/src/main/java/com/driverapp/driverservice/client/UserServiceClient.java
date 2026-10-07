package com.driverapp.driverservice.client;

import com.driverapp.driverservice.dto.response.UserInfoResponse;
import com.driverapp.driverservice.exception.UserServiceException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalancerInterceptor;
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
            LoadBalancerInterceptor loadBalancerInterceptor,
            @Value("${services.user.base-url:http://userservice}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestInterceptor(loadBalancerInterceptor)
                .build();
    }

    /**
     * Grant role to user via User Service (endpoint /api/users/{userId}/roles).
     * Throws exception on failure to trigger transaction rollback.
     */
    public void grantRole(UUID userId, String roleCode) {
        try {
            restClient.post()
                    .uri("/api/users/{userId}/roles", userId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("roleCode", roleCode))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Successfully granted role {} to userId={}", roleCode, userId);
        } catch (Exception e) {
            log.error("Failed to grant role {} to userId={}: {}", roleCode, userId, e.getMessage());
            throw new UserServiceException("Failed to grant role " + roleCode + " to user " + userId, e);
        }
    }

    /**
     * Get user info (username, phoneNumber) from User Service.
     */
    public UserInfoResponse getUserInfo(UUID userId) {
        try {
            return restClient.get()
                    .uri("/api/users/{userId}", userId)
                    .retrieve()
                    .body(UserInfoResponse.class);
        } catch (Exception e) {
            log.warn("Cannot fetch user info for userId={}: {}", userId, e.getMessage());
            return new UserInfoResponse(userId, "N/A", "N/A");
        }
    }
}
