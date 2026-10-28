package com.driverapp.bookingservice.dto.ai;

import lombok.Builder;

import java.util.List;
import java.util.UUID;

public record FoodRecommendationRequest(
        UUID userId,
        double userLatitude,
        double userLongitude,
        double userAvgOrderPrice,
        int userTotalOrders,
        int hourOfDay,
        int dayOfWeek,
        List<CandidateFoodItem> candidateFoods
) {
    @Builder
    public record CandidateFoodItem(
            String foodId,
            String foodName,
            double price,
            String restaurantId,
            String restaurantName,
            double restaurantLatitude,
            double restaurantLongitude,
            double distanceKm,
            double restaurantRating
    ) {}
}
