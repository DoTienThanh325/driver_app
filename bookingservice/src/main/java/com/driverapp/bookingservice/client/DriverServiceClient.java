package com.driverapp.bookingservice.client;

import com.driverapp.bookingservice.dto.response.NearbyDriverDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import com.driverapp.bookingservice.config.HttpClientConfig;
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
            HttpClientConfig httpClients,
            @Value("${services.driver.base-url:http://driverservice}") String baseUrl) {
        this.restClient = httpClients.client("driver", baseUrl, true);
    }

    public record DriverCheckResult(UUID driverId, String status) {
    }

    /**
     * Gọi driver-service kiểm tra tài xế theo driverId (chính là userId)
     */
    public void checkDriverAvailable(UUID driverId) {
        DriverCheckResult result = restClient.get()
                .uri("/api/drivers/check-available/{driverId}", driverId)
                .retrieve()
                .body(DriverCheckResult.class);

        if (result == null || result.driverId() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không lấy được thông tin tài xế");
        }
    }

    public void updateDriverAvailability(UUID driverId, String status) {
        restClient.patch()
                .uri("/api/drivers/availability")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("driverId", driverId, "status", status))
                .retrieve()
                .toBodilessEntity();
    }

    /**
     * Lấy danh sách tài xế lân cận từ driver-service (Redis GEO).
     */
    public List<NearbyDriverDto> getNearbyDrivers(double lat, double lng,
                                                   double radiusKm, String vehicleType, int limit) {
        String uri = "/api/drivers/nearby?lat={lat}&lng={lng}&radiusKm={radius}&limit={limit}"
                + (vehicleType != null ? "&vehicleType=" + vehicleType : "");

        return restClient.get()
                .uri(uri, lat, lng, radiusKm, limit)
                .retrieve()
                .body(new ParameterizedTypeReference<List<NearbyDriverDto>>() {});
    }
}
