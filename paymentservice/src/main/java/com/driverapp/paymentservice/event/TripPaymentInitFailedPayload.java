package com.driverapp.paymentservice.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripPaymentInitFailedPayload {
    private String tripId;
    private String customerId;
    private BigDecimal amount;
    private String reason;
}
