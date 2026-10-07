package com.driverapp.bookingservice.dto.request;

import com.driverapp.bookingservice.models.enums.TripStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateTripStatusRequest(
        @NotBlank(message = "tripId không được để trống")
        String tripId,

        @NotNull(message = "status không được để trống")
        TripStatus status
) {}
