package com.driverapp.paymentservice.client;

import com.driverapp.paymentservice.dto.internal.BusinessRestaurantDto;
import com.driverapp.paymentservice.dto.internal.CustomerTripCountDto;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalancerInterceptor;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@Component
public class BookingServiceClient {

    private final RestClient restClient;

    public BookingServiceClient(
            LoadBalancerInterceptor loadBalancerInterceptor,
            @Value("${services.booking.base-url:http://bookingservice}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestInterceptor(loadBalancerInterceptor)
                .build();
    }

    /**
     * Gọi sang bookingservice để lấy restaurantId của tài khoản Business
     */
    public String getRestaurantIdByUserId(UUID userId) {
        try {
            BusinessRestaurantDto dto = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/businesses/internal/restaurant")
                            .queryParam("userId", userId)
                            .build())
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, resp) -> {
                        log.warn("Không tìm thấy thông tin nhà hàng cho business userId={}: status={}", userId,
                                resp.getStatusCode());
                        throw new ResponseStatusException(
                                resp.getStatusCode(),
                                "Không tìm thấy thông tin nhà hàng gắn với tài khoản kinh doanh này");
                    })
                    .body(BusinessRestaurantDto.class);

            if (dto == null || dto.restaurantId() == null || dto.restaurantId().isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Tài khoản chưa được liên kết với nhà hàng nào");
            }
            return dto.restaurantId();
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (Exception e) {
            log.error("Lỗi khi kết nối bookingservice để lấy restaurantId: {}", e.getMessage());
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Không thể kết nối đến bookingservice để lấy thông tin nhà hàng");
        }
    }

    /**
     * Lấy số lượng chuyến hoàn thành của Customer từ bookingservice (Internal call, không cần JWT)
     */
    public long getCustomerCompletedTripsCount(UUID customerId) {
        try {
            CustomerTripCountDto dto = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/trips/internal/customer-trips-count")
                            .queryParam("customerId", customerId)
                            .build())
                    .retrieve()
                    .body(CustomerTripCountDto.class);

            return dto != null ? dto.completedTrips() : 0L;
        } catch (Exception e) {
            log.warn("Không thể lấy số chuyến đi cho customerId={}, mặc định = 0: {}", customerId, e.getMessage());
            return 0L;
        }
    }
}
