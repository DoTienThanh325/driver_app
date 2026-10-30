package com.driverapp.bookingservice.dto.ai;

import java.util.List;

public record FoodRecommendationResponse(
        String mealTimeSlot,
        String modelUsed,
        List<RankedFoodItem> rankedFoods
) {
    public record RankedFoodItem(
            String foodId,
            double orderProbability,
            double matchingScore,
            int rank,
            String matchReason
    ) {}
}
