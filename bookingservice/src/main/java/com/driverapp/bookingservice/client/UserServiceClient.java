package com.driverapp.bookingservice.client;

import com.driverapp.bookingservice.dto.response.UserInfoResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import com.driverapp.bookingservice.config.HttpClientConfig;
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
     * Tổng quát: cấp bất kỳ role nào cho user.
     * @param userId   UUID của user
     * @param roleCode tên role cần cấp (ví dụ: "BUSINESS", "DRIVER")
     */
    public void grantRole(UUID userId, String roleCode) {
        restClient.post()
                .uri("/api/users/{userId}/roles", userId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("roleCode", roleCode))
                .retrieve()
                .toBodilessEntity();
        log.info("Cấp role {} thành công cho userId={}", roleCode, userId);
    }

    /**
     * Thu hồi role của user.
     * @param userId   UUID của user
     * @param roleCode tên role cần thu hồi (ví dụ: "BUSINESS")
     */
    public void revokeRole(UUID userId, String roleCode) {
        restClient.delete()
                .uri("/api/users/{userId}/roles/{roleCode}", userId, roleCode)
                .retrieve()
                .toBodilessEntity();
        log.info("Thu hồi role {} thành công cho userId={}", roleCode, userId);
    }

    /**
     * Lấy thông tin cơ bản của user (username, phoneNumber) từ User Service.
     */
    public UserInfoResponse getUserInfo(UUID userId) {
        return restClient.get()
                .uri("/api/users/{userId}", userId)
                .retrieve()
                .body(UserInfoResponse.class);
    }
}
