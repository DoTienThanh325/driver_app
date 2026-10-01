package com.driverapp.bookingservice.repository;

import com.driverapp.bookingservice.models.Food;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface FoodRepository extends MongoRepository<Food, String> {
}