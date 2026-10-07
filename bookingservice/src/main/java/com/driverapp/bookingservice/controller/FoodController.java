package com.driverapp.bookingservice.controller;

import com.driverapp.bookingservice.dto.request.CreateFoodRequest;
import com.driverapp.bookingservice.dto.request.UpdateFoodRequest;
import com.driverapp.bookingservice.service.FoodService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings/foods")
@RequiredArgsConstructor
public class FoodController {

    private final FoodService foodService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> createFood(
            @Valid @RequestBody CreateFoodRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        foodService.createFood(userId, request);
        return Map.of("message", "Thêm món ăn thành công");
    }

    @PatchMapping("/{id}")
    public Map<String, String> updateFood(
            @PathVariable String id,
            @Valid @RequestBody UpdateFoodRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        foodService.updateFood(userId, id, request);
        return Map.of("message", "Cập nhật món ăn thành công");
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFood(
            @PathVariable String id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        foodService.deleteFood(userId, id);
    }
}