package com.driverapp.driverservice.dto.response;

import com.driverapp.driverservice.models.enums.VerificationStatus;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record DriverApprovalResponse(
        UUID driverId,
        UUID userId,
        VerificationStatus verificationStatus,
        LocalDateTime approvedAt,
        String message
) {}
