package com.driverapp.bookingservice.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateFoodRequest(
    @NotBlank String name,
    @NotNull String restaurantId,
    @NotEmpty @Valid List<FoodOptionRequest> options
) {}