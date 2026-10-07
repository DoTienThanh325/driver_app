package com.driverapp.driverservice.dto.request;

import com.driverapp.driverservice.models.enums.VerificationStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateVerificationRequest(
        @NotNull(message = "status cannot be null")
        VerificationStatus status,

        String rejectionReason
) {}
