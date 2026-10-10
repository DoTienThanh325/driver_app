package com.driverapp.paymentservice.models.enums;

public enum TransactionStatus {
    PENDING,            // Chờ tài xế xác nhận nhận tiền
    COMPLETED,          // Tài xế đã bấm xác nhận
    EXPIRED             // Hết hạn
}
