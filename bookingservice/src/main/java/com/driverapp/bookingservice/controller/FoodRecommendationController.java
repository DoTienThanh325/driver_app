package com.driverapp.bookingservice.controller;

import com.driverapp.bookingservice.dto.response.FoodSearchResponse;
import com.driverapp.bookingservice.service.FoodRecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/bookings/foods")
@RequiredArgsConstructor
public class FoodRecommendationController {

    private final FoodRecommendationService foodRecommendationService;

    /**
     * GET /api/bookings/foods/recommendations
     * Trả về danh sách món ăn gợi ý cá nhân hóa cho Home Feed dựa trên vị trí và lịch sử
     */
    @GetMapping("/recommendations")
    @ResponseStatus(HttpStatus.OK)
    public Page<FoodSearchResponse> getRecommendations(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "5.0") double radiusKm,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID customerId = (jwt != null && jwt.getSubject() != null)
                ? UUID.fromString(jwt.getSubject())
                : null;

        return foodRecommendationService.getRecommendedFoods(
                customerId, latitude, longitude, radiusKm, page, size);
    }
}
