package com.driverapp.bookingservice.client;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalancerInterceptor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Slf4j
@Component
public class PaymentServiceClient {

    private final RestClient restClient;

    public PaymentServiceClient(
            LoadBalancerInterceptor loadBalancerInterceptor,
            @Value("${services.payment.base-url:http://paymentservice}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestInterceptor(loadBalancerInterceptor)
                .build();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RestaurantVoucherDto {
        private String id;
        private double discount;
        private double maxDiscount;
        private double minValue;
        private String type;
        private String providerType;
        private String restaurantId;
        private LocalDateTime expiredAt;
        private int claimableCount;
    }

    /**
     * Lấy danh sách voucher của nhà hàng từ paymentservice
     */
    public List<RestaurantVoucherDto> getRestaurantVouchers(String restaurantId) {
        try {
            List<RestaurantVoucherDto> vouchers = restClient.get()
                    .uri("/api/vouchers/restaurants/{restaurantId}", restaurantId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<RestaurantVoucherDto>>() {});
            return vouchers != null ? vouchers : Collections.emptyList();
        } catch (Exception e) {
            log.warn("Không thể lấy danh sách voucher cho restaurantId={} từ paymentservice: {}", restaurantId, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Gọi sang paymentservice để hoàn tất thanh toán tiền mặt (PAY_AFTER) khi chuyến đi hoàn thành
     */
    public void completeTripPayment(String tripId) {
        try {
            restClient.patch()
                    .uri("/api/payments/trip/internal/{tripId}/complete", tripId)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Đã thông báo hoàn tất thanh toán tiền mặt cho tripId={}", tripId);
        } catch (Exception e) {
            log.warn("Không thể cập nhật thanh toán cho tripId={} trên paymentservice: {}", tripId, e.getMessage());
        }
    }
}
