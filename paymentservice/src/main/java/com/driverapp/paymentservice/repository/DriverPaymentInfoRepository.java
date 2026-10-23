package com.driverapp.paymentservice.repository;

import com.driverapp.paymentservice.models.DriverPaymentInfo;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface DriverPaymentInfoRepository extends MongoRepository<DriverPaymentInfo, String> {
    Optional<DriverPaymentInfo> findByDriverId(UUID driverId);
}
