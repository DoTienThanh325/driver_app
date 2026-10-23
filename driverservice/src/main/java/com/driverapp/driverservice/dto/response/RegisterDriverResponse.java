package com.driverapp.driverservice.dto.response;

import java.util.UUID;

import com.driverapp.driverservice.models.enums.VerificationStatus;

public record RegisterDriverResponse(
    UUID driverId,
    VerificationStatus status,
    String message
) {}