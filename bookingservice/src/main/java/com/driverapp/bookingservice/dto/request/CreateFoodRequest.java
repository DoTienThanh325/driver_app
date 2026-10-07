package com.driverapp.bookingservice.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CreateFoodRequest(
    @NotBlank String name,
    @NotEmpty @Valid List<FoodOptionRequest> options
) {}