package com.driverapp.bookingservice.controller;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.driverapp.bookingservice.dto.request.RestaurantRequest;
import com.driverapp.bookingservice.service.RestaurantService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/restaurants")
@RequiredArgsConstructor
public class RestaurantController {
    private final RestaurantService restaurantService;
    
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> createRestaurant(@Valid @RequestBody RestaurantRequest request) {
        restaurantService.createRestaurant(request);
        return Map.of("message", "Đã thêm nhà hàng thành công");
    }

    @PutMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, String> updateRestaurant(
            @PathVariable UUID id,
            @Valid @RequestBody RestaurantRequest request
    ) {
        restaurantService.updateRestaurant(id, request);
        return Map.of("message", "Đã cập nhật nhà hàng thành công");
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, String> deleteRestaurant(@PathVariable UUID id) {
        restaurantService.deleteRestaurant(id);
        return Map.of("message", "Đã xóa nhà hàng thành công");
    }

}
