package com.driverapp.paymentservice.repository;

import com.driverapp.paymentservice.models.TripPayment;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TripPaymentRepository extends MongoRepository<TripPayment, UUID> {
}