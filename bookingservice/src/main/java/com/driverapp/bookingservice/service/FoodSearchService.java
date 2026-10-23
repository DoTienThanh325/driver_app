package com.driverapp.bookingservice.service;

import com.driverapp.bookingservice.dto.request.FoodSearchRequest;
import com.driverapp.bookingservice.dto.response.FoodSearchResponse;
import org.springframework.data.domain.Page;

import java.util.List;

public interface FoodSearchService {
    Page<FoodSearchResponse> searchFoods(FoodSearchRequest request);
    List<String> getSuggestions(String prefix);
    void syncFoodToElasticsearch(String foodId);
    void deleteFoodFromElasticsearch(String foodId);
    void syncAllFoods();
}
