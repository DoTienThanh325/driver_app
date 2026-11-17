package com.driverapp.paymentservice.client;

import com.driverapp.paymentservice.dto.internal.BusinessRestaurantDto;
import com.driverapp.paymentservice.dto.internal.CustomerTripCountDto;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import com.driverapp.paymentservice.config.HttpClientConfig;
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
            HttpClientConfig httpClients,
            @Value("${services.booking.base-url:http://bookingservice}") String baseUrl) {
        this.restClient = httpClients.client("booking", baseUrl, true);
    }

    /**
     * Gọi sang bookingservice để lấy restaurantId của tài khoản Business
     */
    public String getRestaurantIdByUserId(UUID userId) {
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
    }

    /**
     * Lấy số lượng chuyến hoàn thành của Customer từ bookingservice (Internal call, không cần JWT)
     */
    public long getCustomerCompletedTripsCount(UUID customerId) {
        CustomerTripCountDto dto = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/trips/internal/customer-trips-count")
                        .queryParam("customerId", customerId)
                        .build())
                .retrieve()
                .body(CustomerTripCountDto.class);

        return dto != null ? dto.completedTrips() : 0L;
    }

    /**
     * Lấy giá và thông tin chuyến đi từ bookingservice qua tripId (Internal call)
     */
    public com.driverapp.paymentservice.dto.internal.TripPriceDto getTripPrice(String tripId) {
        com.driverapp.paymentservice.dto.internal.TripPriceDto dto = restClient.get()
                .uri("/api/trips/internal/{tripId}", tripId)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (req, resp) -> {
                    log.warn("Không tìm thấy chuyến đi tripId={}: status={}", tripId, resp.getStatusCode());
                    throw new ResponseStatusException(
                            resp.getStatusCode(),
                            "Chuyến đi không tồn tại");
                })
                .body(com.driverapp.paymentservice.dto.internal.TripPriceDto.class);

        if (dto == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Chuyến đi không tồn tại");
        }
        return dto;
    }
}

