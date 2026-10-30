package com.driverapp.bookingservice.client;

import com.driverapp.bookingservice.dto.response.NearbyDriverDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalancerInterceptor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
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

    public record DriverCheckResult(UUID driverId, String status) {
    }

    /**
     * Gọi driver-service kiểm tra tài xế theo driverId (chính là userId)
     */
    public void checkDriverAvailable(UUID driverId) {
        try {
            DriverCheckResult result = restClient.get()
                    .uri("/api/drivers/check-available/{driverId}", driverId)
                    .retrieve()
                    .body(DriverCheckResult.class);

            if (result == null || result.driverId() == null) {
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

    /**
     * Lấy danh sách tài xế lân cận từ driver-service (Redis GEO).
     */
    public List<NearbyDriverDto> getNearbyDrivers(double lat, double lng,
                                                   double radiusKm, String vehicleType, int limit) {
        try {
            String uri = "/api/drivers/nearby?lat={lat}&lng={lng}&radiusKm={radius}&limit={limit}"
                    + (vehicleType != null ? "&vehicleType=" + vehicleType : "");

            return restClient.get()
                    .uri(uri, lat, lng, radiusKm, limit)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<NearbyDriverDto>>() {});
        } catch (Exception e) {
            log.error("Lỗi khi lấy danh sách tài xế gần từ driver-service: {}", e.getMessage());
            return List.of();
        }
    }
}