package com.driverapp.bookingservice.controller;

import com.driverapp.bookingservice.dto.request.CancelTripRequest;
import com.driverapp.bookingservice.dto.request.CreateTripRequest;
import com.driverapp.bookingservice.dto.request.UpdateTripStatusRequest;
import com.driverapp.bookingservice.dto.response.AcceptTripResponse;
import com.driverapp.bookingservice.dto.response.CreateTripResponse;
import com.driverapp.bookingservice.dto.response.CustomerTripCountDto;
import com.driverapp.bookingservice.service.TripService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
public class TripController {

    private final TripService tripService;

    /**
     * POST /api/trips
     * customerId lấy từ JWT.sub (không nhận trong body)
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CreateTripResponse createTrip(
            @Valid @RequestBody CreateTripRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID customerId = UUID.fromString(jwt.getSubject());
        return tripService.createTrip(customerId, request);
    }

    /** POST /api/trips/{tripId}/accept — Driver nhận chuyến */
    @PostMapping("/{tripId}/accept")
    public AcceptTripResponse acceptTrip(
            @PathVariable String tripId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID driverUserId = UUID.fromString(jwt.getSubject());
        return tripService.acceptTrip(tripId, driverUserId);
    }

    /**
     * PATCH /api/trips/status
     * Driver cập nhật trạng thái chuyến đi (body gồm tripId và status).
     * Kiểm tra đúng driver đang nhận chuyến mới cho phép cập nhật.
     * Chặn tài xế hủy chuyến (không được gửi CANCELLED).
     */
    @PatchMapping("/status")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, String> updateTripStatus(
            @Valid @RequestBody UpdateTripStatusRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID driverUserId = UUID.fromString(jwt.getSubject());
        tripService.updateTripStatus(driverUserId, request);
        return Map.of("message", "Cập nhật trạng thái chuyến đi thành công");
    }

    /**
     * PATCH /api/trips/{tripId}/cancel
     * Customer hủy chuyến đi khi chưa có tài xế nhận chuyến.
     * Body gồm: status (bắt buộc CANCELLED) và cancelReason.
     */
    @PatchMapping("/{tripId}/cancel")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, String> cancelTrip(
            @PathVariable String tripId,
            @Valid @RequestBody CancelTripRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID customerId = UUID.fromString(jwt.getSubject());
        tripService.cancelTripByCustomer(tripId, customerId, request);
        return Map.of("message", "Hủy chuyến đi thành công");
    }

    /**
     * GET /api/trips/internal/customer-trips-count?customerId={customerId}
     * Internal API cho paymentservice đếm số chuyến hoàn thành của Customer
     */
    @GetMapping("/internal/customer-trips-count")
    public CustomerTripCountDto getCustomerCompletedTripsCount(@RequestParam UUID customerId) {
        long count = tripService.countCompletedTrips(customerId);
        return new CustomerTripCountDto(customerId, count);
    }
}