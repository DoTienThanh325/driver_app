package com.driverapp.bookingservice.repository;

import com.driverapp.bookingservice.models.Trip;
import com.driverapp.bookingservice.models.enums.ShippingType;
import com.driverapp.bookingservice.models.enums.TripStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TripRepository extends MongoRepository<Trip, String> {
    Optional<Trip> findTopByCustomerIdOrderByCreatedAtDesc(UUID customerId);

    long countByCustomerIdAndStatus(UUID customerId, TripStatus status);

    List<Trip> findByCustomerIdAndShippingType(UUID customerId, ShippingType shippingType);
}
