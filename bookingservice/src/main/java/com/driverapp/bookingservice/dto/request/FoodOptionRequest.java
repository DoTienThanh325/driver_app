package com.driverapp.bookingservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record FoodOptionRequest(
    @NotBlank String size,
    @Positive double price
) {}