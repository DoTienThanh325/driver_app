package com.driverapp.bookingservice.client;

import com.driverapp.bookingservice.dto.response.UserInfoResponse;
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

    /**
     * Thu hồi role của user.
     * @param userId   UUID của user
     * @param roleCode tên role cần thu hồi (ví dụ: "BUSINESS")
     */
    public void revokeRole(UUID userId, String roleCode) {
        try {
            restClient.delete()
                    .uri("/api/users/{userId}/roles/{roleCode}", userId, roleCode)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Thu hồi role {} thành công cho userId={}", roleCode, userId);
        } catch (Exception e) {
            log.warn("Không thể thu hồi role {} cho userId={}: {}", roleCode, userId, e.getMessage());
        }
    }

    /**
     * Lấy thông tin cơ bản của user (username, phoneNumber) từ User Service.
     */
    public UserInfoResponse getUserInfo(UUID userId) {
        try {
            return restClient.get()
                    .uri("/api/users/{userId}", userId)
                    .retrieve()
                    .body(UserInfoResponse.class);
        } catch (Exception e) {
            log.warn("Không thể lấy thông tin user cho userId={}: {}", userId, e.getMessage());
            return new UserInfoResponse(userId, "N/A", "N/A");
        }
    }
}
