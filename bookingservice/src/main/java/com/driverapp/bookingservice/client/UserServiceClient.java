package com.driverapp.bookingservice.client;

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
     * Tổng quát: cấp bất kỳ role nào cho user.
     * @param userId   UUID của user
     * @param roleCode tên role cần cấp (ví dụ: "BUSINESS", "DRIVER")
     */
    public void grantRole(UUID userId, String roleCode) {
        try {
            restClient.post()
                    .uri("/api/users/{userId}/roles", userId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("roleCode", roleCode))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Cấp role {} thành công cho userId={}", roleCode, userId);
        } catch (Exception e) {
            log.warn("Không thể cấp role {} cho userId={}: {}", roleCode, userId, e.getMessage());
        }
    }
}
