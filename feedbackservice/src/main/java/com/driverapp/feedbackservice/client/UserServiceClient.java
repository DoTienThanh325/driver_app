package com.driverapp.feedbackservice.client;

import com.driverapp.feedbackservice.dto.response.UserInfoResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalancerInterceptor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

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
     * Lấy thông tin user (username, phoneNumber) từ userservice.
     */
    public UserInfoResponse getUserInfo(UUID userId) {
        try {
            return restClient.get()
                    .uri("/api/users/{userId}", userId)
                    .retrieve()
                    .body(UserInfoResponse.class);
        } catch (Exception e) {
            log.warn("Không thể lấy thông tin user cho userId={}: {}", userId, e.getMessage());
            return new UserInfoResponse (userId, "Khách hàng", "N/A");
        }
    }
}
