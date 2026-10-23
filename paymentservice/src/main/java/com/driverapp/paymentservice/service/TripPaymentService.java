package com.driverapp.paymentservice.service;

import com.driverapp.paymentservice.dto.request.CreateDriverPaymentInfoRequest;
import com.driverapp.paymentservice.dto.request.SwitchToPayBeforeRequest;
import com.driverapp.paymentservice.dto.response.TripPaymentResponse;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;

public interface TripPaymentService {

    /** 1. Tự động tạo thanh toán mặc định PAY_DIRECTLY khi tạo chuyến đi */
    void initDefaultPayDirectlyPayment(String tripId, UUID customerId, double totalAmount);

    /** 2. Cập nhật thông tin tài xế khi nhận chuyến (VẪN GIỮ NGUYÊN PAY_DIRECTLY) */
    void assignDriverToPayment(String tripId, UUID driverId);

    /** 3. Customer cập nhật (PATCH) phương thức thanh toán sang PAY_BEFORE khi tài xế đã nhận cuốc */
    TripPaymentResponse switchToPayBefore(String tripId, SwitchToPayBeforeRequest request, Jwt jwt);

    /** 4. Lấy chi tiết thông tin thanh toán của chuyến đi */
    TripPaymentResponse getTripPaymentByTripId(String tripId, Jwt jwt);

    /** 5. Driver xác nhận đã nhận tiền chuyển khoản (PAY_BEFORE) - API có sẵn */
    Map<String, String> confirmPayment(String tripPaymentId, Jwt jwt);

    /** 6. Driver đăng ký / cập nhật STK ngân hàng nhận tiền - API có sẵn */
    Map<String, String> registerDriverPaymentInfo(CreateDriverPaymentInfoRequest request, Jwt jwt);

    /** 7. Tự động chốt thanh toán trực tiếp khi chuyến đi hoàn thành */
    Map<String, String> completePayDirectlyTripPayment(String tripId);

    /** Tương thích ngược */
    Map<String, String> completePayAfterTripPayment(String tripId);
}
