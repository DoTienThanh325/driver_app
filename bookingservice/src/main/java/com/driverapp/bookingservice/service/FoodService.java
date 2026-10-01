package com.driverapp.bookingservice.service;

import com.driverapp.bookingservice.dto.request.CreateFoodRequest;
import com.driverapp.bookingservice.dto.request.UpdateFoodRequest;


public interface FoodService {
    void createFood(CreateFoodRequest request);

    void updateFood(String id, UpdateFoodRequest request);

    void deleteFood(String id);
}