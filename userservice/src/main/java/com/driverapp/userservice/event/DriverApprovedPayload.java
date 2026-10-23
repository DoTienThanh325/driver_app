package com.driverapp.userservice.event;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverApprovedPayload {
    private String driverId;
    private String userId;
}
