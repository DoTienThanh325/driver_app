package com.driverapp.bookingservice.controller;

import com.driverapp.bookingservice.dto.request.FoodSearchRequest;
import com.driverapp.bookingservice.dto.response.FoodSearchResponse;
import com.driverapp.bookingservice.service.FoodSearchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings/foods/search")
@RequiredArgsConstructor
public class FoodSearchController {

    private final FoodSearchService foodSearchService;

    /**
     * API Tìm kiếm món ăn theo TÊN và sắp xếp theo KHOẢNG CÁCH (nếu có toạ độ người dùng)
     * GET /api/bookings/foods/search?name=cơm+gà&latitude=10.7769&longitude=106.6956
     */
    @GetMapping
    public ResponseEntity<Page<FoodSearchResponse>> searchFoods(@Valid @ModelAttribute FoodSearchRequest request) {
        Page<FoodSearchResponse> result = foodSearchService.searchFoods(request);
        return ResponseEntity.ok(result);
    }

    /**
     * Gợi ý từ khóa tự động (Autocomplete)
     * GET /api/bookings/foods/search/suggest?prefix=bun
     */
    @GetMapping("/suggest")
    public ResponseEntity<List<String>> suggestFoods(@RequestParam String prefix) {
        return ResponseEntity.ok(foodSearchService.getSuggestions(prefix));
    }

    /**
     * Endpoint quản trị đồng bộ toàn bộ MongoDB -> Elasticsearch
     * POST /api/bookings/foods/search/sync-all
     */
    @PostMapping("/sync-all")
    public ResponseEntity<Map<String, String>> syncAllFoods() {
        foodSearchService.syncAllFoods();
        return ResponseEntity.ok(Map.of("message", "Đã đồng bộ toàn bộ món ăn sang Elasticsearch"));
    }
}
