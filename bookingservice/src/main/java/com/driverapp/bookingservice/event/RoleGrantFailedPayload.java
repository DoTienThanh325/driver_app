package com.driverapp.bookingservice.event;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleGrantFailedPayload {
    private String entityId;
    private String userId;
    private String targetRole;
    private String reason;
    private String originalEventRoutingKey;
}
