package com.driverapp.paymentservice.models;

import com.driverapp.paymentservice.models.enums.TransactionStatus;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "payment_transactions")
public class PaymentTransaction {
    @Id
    private String id;

    private String tripPaymentId;
    private String tripId;
    private UUID driverId;

    private double amount;
    private String bankBin;
    private String bankAccountNumber;
    private String bankAccountName;
    private String transferContent;
    private String qrDataURL;

    private TransactionStatus status;
    private LocalDateTime expiresAt;
    private LocalDateTime confirmedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
