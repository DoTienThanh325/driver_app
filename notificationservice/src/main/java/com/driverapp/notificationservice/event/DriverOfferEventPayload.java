package com.driverapp.notificationservice.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverOfferEventPayload {
    private String offerId;
    private String tripId;
    private String driverId;
    private String status;
    private boolean backToBack;
}
