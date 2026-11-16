package com.driverapp.bookingservice.client;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import com.driverapp.bookingservice.config.HttpClientConfig;
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
            HttpClientConfig httpClients,
            @Value("${services.payment.base-url:http://paymentservice}") String baseUrl) {
        this.restClient = httpClients.client("payment", baseUrl, true);
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
        List<RestaurantVoucherDto> vouchers = restClient.get()
                .uri("/api/vouchers/restaurants/{restaurantId}", restaurantId)
                .retrieve()
                .body(new ParameterizedTypeReference<List<RestaurantVoucherDto>>() {});
        return vouchers != null ? vouchers : Collections.emptyList();
    }

    /**
     * Gọi sang paymentservice để hoàn tất thanh toán tiền mặt (PAY_AFTER) khi chuyến đi hoàn thành
     */
    public void completeTripPayment(String tripId) {
        restClient.patch()
                .uri("/api/payments/trip/internal/{tripId}/complete", tripId)
                .retrieve()
                .toBodilessEntity();
        log.info("Đã thông báo hoàn tất thanh toán tiền mặt cho tripId={}", tripId);
    }
}
