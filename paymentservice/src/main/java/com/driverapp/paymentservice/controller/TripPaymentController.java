package com.driverapp.paymentservice.controller;

import com.driverapp.paymentservice.dto.request.CreateDriverPaymentInfoRequest;
import com.driverapp.paymentservice.dto.request.SwitchToPayBeforeRequest;
import com.driverapp.paymentservice.dto.response.TripPaymentResponse;
import com.driverapp.paymentservice.service.TripPaymentService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class TripPaymentController {

    private final TripPaymentService tripPaymentService;

    /**
     * PATCH /api/payments/trip/{tripId}/pay-before
     * Customer chuyển phương thức thanh toán sang PAY_BEFORE khi tài xế đã nhận cuốc
     * (Không còn API tạo thanh toán thủ công)
     */
    @PatchMapping("/trip/{tripId}/pay-before")
    public TripPaymentResponse switchToPayBefore(
            @PathVariable String tripId,
            @RequestBody(required = false) SwitchToPayBeforeRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return tripPaymentService.switchToPayBefore(tripId, request, jwt);
    }

    /**
     * GET /api/payments/trip/{tripId}
     * Lấy thông tin thanh toán của chuyến đi (cho Customer và Driver theo dõi)
     */
    @GetMapping("/trip/{tripId}")
    public TripPaymentResponse getTripPayment(
            @PathVariable String tripId,
            @AuthenticationPrincipal Jwt jwt) {
        return tripPaymentService.getTripPaymentByTripId(tripId, jwt);
    }

    /**
     * PATCH /api/payments/trip/{tripPaymentId}/confirm
     * Driver xác nhận đã nhận được tiền chuyển khoản từ khách hàng (API có sẵn)
     */
    @PatchMapping("/trip/{tripPaymentId}/confirm")
    public Map<String, String> confirmPayment(
            @PathVariable String tripPaymentId,
            @AuthenticationPrincipal Jwt jwt) {
        return tripPaymentService.confirmPayment(tripPaymentId, jwt);
    }

    /**
     * POST /api/payments/driver-payment-info
     * Driver đăng ký / cập nhật STK ngân hàng của mình (API có sẵn)
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
     * Internal API: Booking Service gọi khi status trip == COMPLETED để hoàn tất thanh toán tiền mặt (PAY_DIRECTLY)
     */
    @PatchMapping("/trip/internal/{tripId}/complete")
    public Map<String, String> completePayDirectlyPayment(@PathVariable String tripId) {
        return tripPaymentService.completePayDirectlyTripPayment(tripId);
    }
}
