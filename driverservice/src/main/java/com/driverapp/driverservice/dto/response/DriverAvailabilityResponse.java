package com.driverapp.driverservice.dto.response;

import com.driverapp.driverservice.models.enums.AvailabilityStatus;
import com.driverapp.driverservice.models.enums.VerificationStatus;
import lombok.Builder;

import java.util.UUID;

@Builder
public record DriverAvailabilityResponse(
        UUID driverId,
        UUID userId,
        AvailabilityStatus status,
        boolean online,
        VerificationStatus verificationStatus,
        String message
) {}
