package com.driverapp.bookingservice.dto.response;

import com.driverapp.bookingservice.models.enums.BusinessRegistrationStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record BusinessRegistrationSummaryResponse(
        String id,
        UUID userId,
        String restaurantName,
        BusinessRegistrationStatus status,
        LocalDateTime createdAt
) {}
