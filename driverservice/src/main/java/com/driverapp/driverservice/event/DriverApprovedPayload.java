package com.driverapp.driverservice.event;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverApprovedPayload {
    private String driverId;
    private String userId;
}
