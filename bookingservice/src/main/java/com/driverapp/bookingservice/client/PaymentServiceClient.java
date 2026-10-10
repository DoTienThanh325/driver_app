package com.driverapp.bookingservice.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalancerInterceptor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

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
