package com.driverapp.paymentservice.event;

import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCompleteFailedPayload {
    private String tripId;
    private String customerId;
    private BigDecimal amount;
    private String paymentMethod;
    private String reason;
}
