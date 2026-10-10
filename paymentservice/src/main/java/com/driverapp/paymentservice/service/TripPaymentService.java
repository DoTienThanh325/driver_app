package com.driverapp.paymentservice.service;

import com.driverapp.paymentservice.dto.request.CreateDriverPaymentInfoRequest;
import com.driverapp.paymentservice.dto.request.CreateTripPaymentRequest;
import com.driverapp.paymentservice.dto.response.TripPaymentResponse;
import java.util.Map;
import org.springframework.security.oauth2.jwt.Jwt;

public interface TripPaymentService {

    /** 1. Customer tạo thanh toán chuyến đi (PAY_AFTER hoặc PAY_BEFORE) */
    TripPaymentResponse createTripPayment(CreateTripPaymentRequest request, Jwt jwt);

    /** 2. Driver xác nhận đã nhận tiền chuyển khoản (PAY_BEFORE) */
    Map<String, String> confirmPayment(String tripPaymentId, Jwt jwt);

    /** 3. Driver đăng ký / cập nhật STK ngân hàng nhận tiền */
    Map<String, String> registerDriverPaymentInfo(CreateDriverPaymentInfoRequest request, Jwt jwt);

    /** 4. Tự động cập nhật thanh toán tiền mặt (PAY_AFTER) sang COMPLETED khi chuyến đi hoàn thành */
    Map<String, String> completePayAfterTripPayment(String tripId);
}

