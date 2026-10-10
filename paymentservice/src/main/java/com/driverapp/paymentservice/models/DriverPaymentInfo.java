package com.driverapp.paymentservice.models;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "driver_payment_infos")
public class DriverPaymentInfo {

    @Id
    private String id;

    @Indexed(unique = true)
    private UUID driverId;

    private String bankName;
    private String bankBin;
    private String bankAccountNumber;
    private String bankAccountName;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
