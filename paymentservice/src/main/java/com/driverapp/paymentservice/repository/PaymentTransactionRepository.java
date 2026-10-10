package com.driverapp.paymentservice.repository;

import com.driverapp.paymentservice.models.PaymentTransaction;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PaymentTransactionRepository extends MongoRepository<PaymentTransaction, String> {
    Optional<PaymentTransaction> findByTripPaymentId(String tripPaymentId);
}
