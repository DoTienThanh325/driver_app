package com.driverapp.paymentservice.repository;

import com.driverapp.paymentservice.models.TripPayment;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TripPaymentRepository extends MongoRepository<TripPayment, String> {
    Optional<TripPayment> findByTripId(String tripId);
}
