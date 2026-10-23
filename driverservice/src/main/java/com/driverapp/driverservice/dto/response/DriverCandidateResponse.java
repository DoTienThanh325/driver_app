package com.driverapp.driverservice.dto.response;

import com.driverapp.driverservice.models.enums.VerificationStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record DriverCandidateResponse(
        UUID driverId,
        String username,
        String phoneNumber,
        VerificationStatus verificationStatus,
        LocalDateTime createdAt
) {}
