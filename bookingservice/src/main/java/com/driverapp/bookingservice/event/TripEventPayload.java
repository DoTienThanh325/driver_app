package com.driverapp.bookingservice.event;

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
    private String tripStatus;        // DRIVER_ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED
    private String paymentMethod;     // CASH, PAY_NOW, PAY_AFTER
    private BigDecimal totalAmount;
    private String pickupAddress;
    private String dropoffAddress;
}
