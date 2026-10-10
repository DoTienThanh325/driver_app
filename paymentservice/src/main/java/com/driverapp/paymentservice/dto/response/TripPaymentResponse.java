package com.driverapp.paymentservice.dto.response;

import com.driverapp.paymentservice.models.enums.PaymentMethod;
import com.driverapp.paymentservice.models.enums.TripPaymentStatus;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripPaymentResponse {
    private String message;
    private String tripPaymentId;
    private double totalAmount;
    private double discountAmount;
    private double finalAmount;
    private PaymentMethod method;
    private TripPaymentStatus status;
    private QrPaymentInfo qrPayment;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QrPaymentInfo {
        private String transactionId;
        private String qrDataURL;
        private String bankName;
        private String bankBin;
        private String bankAccountNumber;
        private String bankAccountName;
        private double amount;
        private String transferContent;
        private LocalDateTime expiresAt;
    }
}
