package com.driverapp.feedbackservice.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalancerInterceptor;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
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

    /**
     * Tra cứu driverId theo userId của tài xế.
     */
    public UUID getDriverIdByUserId(UUID userId) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.get()
                    .uri("/api/drivers/by-user/{userId}", userId)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, resp) -> {
                        log.warn("Không tìm thấy hồ sơ tài xế cho userId={}: status={}", userId, resp.getStatusCode());
                        throw new ResponseStatusException(
                                resp.getStatusCode(),
                                "Không tìm thấy hồ sơ tài xế tương ứng với tài khoản này");
                    })
                    .body(Map.class);

            if (response == null || !response.containsKey("driverId")) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Dữ liệu hồ sơ tài xế không hợp lệ");
            }

            return UUID.fromString(response.get("driverId").toString());
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (Exception e) {
            log.error("Lỗi khi kết nối tới driverservice để tra cứu driverId: {}", e.getMessage());
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Không thể kết nối đến dịch vụ quản lý tài xế");
        }
    }
}
