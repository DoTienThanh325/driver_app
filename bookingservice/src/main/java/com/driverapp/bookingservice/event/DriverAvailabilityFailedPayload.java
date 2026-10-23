package com.driverapp.bookingservice.event;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverAvailabilityFailedPayload {
    private String tripId;
    private String driverId;
    private String targetStatus;
    private String reason;
    private String originalEventRoutingKey;
}
