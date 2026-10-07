package com.driverapp.bookingservice.service;

import com.driverapp.bookingservice.dto.request.CreateFoodRequest;
import com.driverapp.bookingservice.dto.request.UpdateFoodRequest;

import java.util.UUID;

public interface FoodService {
    void createFood(UUID userId, CreateFoodRequest request);

    void updateFood(UUID userId, String id, UpdateFoodRequest request);

    void deleteFood(UUID userId, String id);
}