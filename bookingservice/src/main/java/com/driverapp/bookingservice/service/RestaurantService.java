package com.driverapp.bookingservice.service;

import com.driverapp.bookingservice.dto.request.RestaurantRequest;
import com.driverapp.bookingservice.models.Restaurant;

import java.util.UUID;

public interface RestaurantService {

    /**
     * Create restaurant entity
     */
    Restaurant createRestaurant(RestaurantRequest request);

    /**
     * Update 4 restaurant fields (name, locationAddress, locationLatitude, locationLongitude).
     * Validates business ownership.
     */
    void updateRestaurant(UUID userId, String restaurantId, RestaurantRequest request);

    /**
     * Delete restaurant and cascade delete all foods belonging to this restaurant.
     * Validates business ownership.
     */
    void deleteRestaurant(UUID userId, String restaurantId);
}
