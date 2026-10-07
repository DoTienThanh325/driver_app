package com.driverapp.bookingservice.controller;

import com.driverapp.bookingservice.dto.request.RestaurantRequest;
import com.driverapp.bookingservice.models.Restaurant;
import com.driverapp.bookingservice.service.RestaurantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings/restaurants")
@RequiredArgsConstructor
public class RestaurantController {

    private final RestaurantService restaurantService;

    /**
     * PUT /api/bookings/restaurants/{restaurantId}
     * Update 4 restaurant fields (name, locationAddress, locationLatitude, locationLongitude).
     */
    @PatchMapping("/{restaurantId}")
    public Map<String, String> updateRestaurant(
            @PathVariable String restaurantId,
            @Valid @RequestBody RestaurantRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        restaurantService.updateRestaurant(userId, restaurantId, request);
        return Map.of("message", "updated successfully");
    }

    /**
     * DELETE /api/bookings/restaurants/{restaurantId}
     * Deletes restaurant and cascades all associated foods.
     */
    @DeleteMapping("/{restaurantId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Map<String, String> deleteRestaurant(
            @PathVariable String restaurantId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        restaurantService.deleteRestaurant(userId, restaurantId);
        return Map.of("message", "delete successfully");
    }
}
