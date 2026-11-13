package com.driverapp.bookingservice.service;

import com.driverapp.bookingservice.dto.request.CreateFoodRequest;
import com.driverapp.bookingservice.dto.request.UpdateFoodRequest;
import com.driverapp.bookingservice.dto.response.FoodDetailResponse;
import com.driverapp.bookingservice.dto.response.FoodListResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface FoodService {
    String createFood(UUID userId, CreateFoodRequest request, List<MultipartFile> images);

    void updateFood(UUID userId, String id, UpdateFoodRequest request, List<MultipartFile> images);

    default void updateFood(UUID userId, String id, UpdateFoodRequest request) {
        updateFood(userId, id, request, null);
    }

    void deleteFood(UUID userId, String id);

    Page<FoodListResponse> getAllFoods(String restaurantId, Pageable pageable);

    FoodDetailResponse getFoodDetail(String id, Double userLat, Double userLng);
}