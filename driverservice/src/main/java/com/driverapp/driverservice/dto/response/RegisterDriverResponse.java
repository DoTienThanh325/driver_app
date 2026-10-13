package com.driverapp.driverservice.dto.response;

import java.util.UUID;

import com.driverapp.driverservice.models.enums.VerificationStatus;

public record RegisterDriverResponse(
    UUID userId,
    VerificationStatus status,
    String message
) {}