package com.driverapp.driverservice.event;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverRegistrationUpdatedPayload {
    private String driverId;
    private String userId;
}
