package com.driverapp.bookingservice.repository;

import com.driverapp.bookingservice.models.Business;
import com.driverapp.bookingservice.models.enums.BusinessRegistrationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BusinessRepository extends MongoRepository<Business, String> {

    /** 1 user chỉ có 1 đơn đăng ký kinh doanh duy nhất */
    Optional<Business> findByUserId(UUID userId);

    boolean existsByUserId(UUID userId);

    List<Business> findByStatus(BusinessRegistrationStatus status);
}
