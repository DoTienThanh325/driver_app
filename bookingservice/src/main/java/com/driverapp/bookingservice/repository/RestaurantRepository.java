package com.driverapp.bookingservice.repository;

import com.driverapp.bookingservice.models.Restaurant;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface RestaurantRepository
        extends MongoRepository<Restaurant, String> {
}