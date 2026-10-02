package com.driverapp.bookingservice.dto.request;

import com.driverapp.bookingservice.models.enums.BusinessRegistrationStatus;
import jakarta.validation.constraints.NotNull;

public record ReviewBusinessRequest(
        @NotNull(message = "status không được để trống")
        BusinessRegistrationStatus status,

        /** Bắt buộc khi status = REJECTED */
        String rejectReason
) {}
