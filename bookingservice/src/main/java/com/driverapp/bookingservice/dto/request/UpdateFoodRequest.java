package com.driverapp.bookingservice.dto.request;

import jakarta.validation.Valid;

import java.util.List;


public record UpdateFoodRequest(
    String name,
    @Valid List<FoodOptionRequest> options
) {}