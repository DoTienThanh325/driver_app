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

    public record DriverCheckResult(UUID driverId, UUID userId, String status) {
    }

    /**
     * 1. Gọi driver-service kiểm tra tài xế theo userId và lấy driverId thực tế
     */
    public UUID getAvailableDriverId(UUID driverUserId) {
        try {
            DriverCheckResult result = restClient.get()
                    .uri("/api/drivers/check-available/{userId}", driverUserId)
                    .retrieve()
                    .body(DriverCheckResult.class);

            if (result == null || result.driverId() == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không lấy được thông tin tài xế");
            }
            return result.driverId();
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Lỗi khi kiểm tra tài xế từ driver-service: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Lỗi kết nối tới driver-service: " + e.getMessage());
        }
    }

    /**
     * 2. Dành cho updateTripStatus: Lấy driverId thuần túy theo userId khi tài xế
     * đang ON_TRIP
     */
    public UUID getDriverIdByUserId(UUID driverUserId) {
        try {
            Map<?, ?> result = restClient.get()
                    .uri("/api/drivers/by-user/{userId}", driverUserId)
                    .retrieve()
                    .body(Map.class);
            if (result == null || result.get("driverId") == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ tài xế");
            }
            return UUID.fromString(result.get("driverId").toString());
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Lỗi khi lấy driverId từ driver-service: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Lỗi kết nối tới driver-service: " + e.getMessage());
        }
    }

    public void updateDriverAvailability(UUID driverId, String status) {
        try {
            restClient.patch()
                    .uri("/api/drivers/availability")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("driverId", driverId, "status", status))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("Không thể cập nhật availability cho driverId={}: {}", driverId, e.getMessage());
        }
    }
}