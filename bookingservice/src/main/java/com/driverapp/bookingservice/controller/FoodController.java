package com.driverapp.bookingservice.controller;

import com.driverapp.bookingservice.dto.request.CreateFoodRequest;
import com.driverapp.bookingservice.dto.request.UpdateFoodRequest;
import com.driverapp.bookingservice.service.FoodService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings/foods")
@RequiredArgsConstructor
public class FoodController {

    private final FoodService foodService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> createFood(
            @Valid @RequestPart("food") CreateFoodRequest request,
            @RequestPart("images") List<MultipartFile> images,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String foodId = foodService.createFood(userId, request, images);
        return Map.of(
                "message", "Thêm món ăn thành công",
                "foodId", foodId
        );
    }

    @PatchMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> updateFood(
            @PathVariable String id,
            @Valid @RequestPart("food") UpdateFoodRequest request,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        foodService.updateFood(userId, id, request, images);
        return Map.of("message", "Cập nhật món ăn thành công");
    }

    @PatchMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, String> updateFoodJson(
            @PathVariable String id,
            @Valid @RequestBody UpdateFoodRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        foodService.updateFood(userId, id, request, null);
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