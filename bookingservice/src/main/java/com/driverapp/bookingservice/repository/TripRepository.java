package com.driverapp.bookingservice.repository;

import com.driverapp.bookingservice.models.Trip;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;
import java.util.UUID;

public interface TripRepository extends MongoRepository<Trip, String> {
    Optional<Trip> findTopByCustomerIdOrderByCreatedAtDesc(UUID customerId);
}