package com.driverapp.userservice.event;

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
}
