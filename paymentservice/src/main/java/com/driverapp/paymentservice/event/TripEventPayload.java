package com.driverapp.paymentservice.event;

import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripEventPayload {
    private String tripId;
    private String customerId;
    private String driverId;
    private String tripStatus;
    private String paymentMethod;
    private BigDecimal totalAmount;
    private String pickupAddress;
    private String dropoffAddress;
}
