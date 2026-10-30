package com.driverapp.bookingservice.service;

import com.driverapp.bookingservice.dto.response.FoodSearchResponse;
import org.springframework.data.domain.Page;

import java.util.UUID;

public interface FoodRecommendationService {
    Page<FoodSearchResponse> getRecommendedFoods(
            UUID customerId, double latitude, double longitude, double radiusKm, int page, int size);
}
