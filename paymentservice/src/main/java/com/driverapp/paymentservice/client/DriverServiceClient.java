package com.driverapp.paymentservice.client;

import java.util.Map;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalancerInterceptor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

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

    /**
     * Tra cứu driverId thực tế trong bảng drivers thông qua userId của tài khoản Driver
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
            log.error("Lỗi khi kết nối driverservice để lấy driverId từ userId={}: {}", driverUserId, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Không thể kết nối đến driverservice để xác thực thông tin tài xế");
        }
    }
}
