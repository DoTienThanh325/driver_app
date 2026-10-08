package com.driverapp.bookingservice.dto.request;

import com.driverapp.bookingservice.models.enums.TripStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CancelTripRequest(
        @NotNull(message = "status không được để trống")
        TripStatus status,

        @NotBlank(message = "cancelReason không được để trống")
        @Size(max = 500, message = "cancelReason không được vượt quá 500 ký tự")
        String cancelReason
) {}
