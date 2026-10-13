package com.driverapp.bookingservice.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalancerInterceptor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
public class DriverServiceClient {

    private final RestClient restClient;

    public DriverServiceClient(
            LoadBalancerInterceptor loadBalancerInterceptor,
            @Value("${services.driver.base-url:http://driverservice}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestInterceptor(loadBalancerInterceptor)
                .build();
    }

    public record DriverCheckResult(UUID userId, String status) {
    }

    /**
     * Kiểm tra tài xế theo userId (phải tồn tại, APPROVED và AVAILABLE)
     */
    public void checkDriverAvailable(UUID driverUserId) {
        try {
            DriverCheckResult result = restClient.get()
                    .uri("/api/drivers/check-available/{userId}", driverUserId)
                    .retrieve()
                    .body(DriverCheckResult.class);

            if (result == null || result.userId() == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không lấy được thông tin tài xế");
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Lỗi khi kiểm tra tài xế từ driver-service: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Lỗi kết nối tới driver-service: " + e.getMessage());
        }
    }

    public void updateDriverAvailability(UUID driverUserId, String status) {
        try {
            restClient.patch()
                    .uri("/api/drivers/availability")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("userId", driverUserId, "status", status))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("Không thể cập nhật availability cho userId={}: {}", driverUserId, e.getMessage());
        }
    }
}