package com.driverapp.bookingservice.repository;

import com.driverapp.bookingservice.models.Trip;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TripRepository extends MongoRepository<Trip, UUID> {
}