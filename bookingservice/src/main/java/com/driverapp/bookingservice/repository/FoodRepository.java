package com.driverapp.bookingservice.repository;

import com.driverapp.bookingservice.models.Food;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface FoodRepository extends MongoRepository<Food, String> {
    void deleteByRestaurantId(String restaurantId);
    Page<Food> findByRestaurantId(String restaurantId, Pageable pageable);
}