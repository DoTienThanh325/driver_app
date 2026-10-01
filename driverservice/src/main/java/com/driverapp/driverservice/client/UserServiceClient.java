package com.driverapp.driverservice.client;

import java.util.UUID;

import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class UserServiceClient {

    private final RestClient loadBalancedRestClient;
    private final RestClient directRestClient;

    public UserServiceClient(@LoadBalanced RestClient.Builder restClientBuilder) {
        this.loadBalancedRestClient = restClientBuilder.baseUrl("http://userservice").build();
        this.directRestClient = RestClient.builder().baseUrl("http://localhost:8081").build();
    }

    public void assignRoleToUser(UUID userId, String roleCode) {
        log.info("Calling user-service to assign role {} to userId {}", roleCode, userId);
        try {
            loadBalancedRestClient.put()
                    .uri("/internal/users/{userId}/roles/{roleCode}", userId, roleCode)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Successfully assigned role {} to userId via Eureka LoadBalancer", roleCode, userId);
        } catch (Exception e) {
            log.warn("LoadBalanced call to userservice failed ({}), falling back to direct URL http://localhost:8081", e.getMessage());
            directRestClient.put()
                    .uri("/internal/users/{userId}/roles/{roleCode}", userId, roleCode)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Successfully assigned role {} to userId via direct fallback URL", roleCode, userId);
        }
    }
}
