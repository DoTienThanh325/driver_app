package com.driverapp.bookingservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RestaurantRequest(
        String name,
        String locationAddress,
        Double locationLatitude,
        Double locationLongitude
) {}
