package com.driverapp.paymentservice.models.enums;

public enum TripPaymentStatus {
    PENDING,            // PAY_DIRECTLY: chờ hoàn thành chuyến để trả trực tiếp
    AWAITING_PAYMENT,   // PAY_BEFORE: chờ khách quét QR chuyển khoản & tài xế xác nhận
    COMPLETED,          // Đã hoàn tất thanh toán
    FAILED              // Thất bại
}
