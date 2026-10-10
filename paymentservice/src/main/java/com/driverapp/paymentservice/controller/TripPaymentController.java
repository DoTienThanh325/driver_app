package com.driverapp.paymentservice.controller;

import com.driverapp.paymentservice.dto.request.CreateDriverPaymentInfoRequest;
import com.driverapp.paymentservice.dto.request.CreateTripPaymentRequest;
import com.driverapp.paymentservice.dto.response.TripPaymentResponse;
import com.driverapp.paymentservice.service.TripPaymentService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class TripPaymentController {

    private final TripPaymentService tripPaymentService;

    /**
     * POST /api/payments/trip
     * Customer tạo thanh toán chuyến đi (PAY_AFTER hoặc PAY_BEFORE)
     */
    @PostMapping("/trip")
    @ResponseStatus(HttpStatus.CREATED)
    public TripPaymentResponse createTripPayment(
            @Valid @RequestBody CreateTripPaymentRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return tripPaymentService.createTripPayment(request, jwt);
    }

    /**
     * PATCH /api/payments/trip/{tripPaymentId}/confirm
     * Driver xác nhận đã nhận được tiền chuyển khoản từ khách hàng
     */
    @PatchMapping("/trip/{tripPaymentId}/confirm")
    public Map<String, String> confirmPayment(
            @PathVariable String tripPaymentId,
            @AuthenticationPrincipal Jwt jwt) {
        return tripPaymentService.confirmPayment(tripPaymentId, jwt);
    }

    /**
     * POST /api/payments/driver-payment-info
     * Driver đăng ký / cập nhật STK ngân hàng của mình
     */
    @PostMapping("/driver-payment-info")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> registerDriverPaymentInfo(
            @Valid @RequestBody CreateDriverPaymentInfoRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return tripPaymentService.registerDriverPaymentInfo(request, jwt);
    }

    /**
     * PATCH /api/payments/trip/internal/{tripId}/complete
     * Internal API: Booking Service gọi khi status trip == COMPLETED để hoàn tất thanh toán tiền mặt (PAY_AFTER)
     */
    @PatchMapping("/trip/internal/{tripId}/complete")
    public Map<String, String> completePayAfterPayment(@PathVariable String tripId) {
        return tripPaymentService.completePayAfterTripPayment(tripId);
    }
}

