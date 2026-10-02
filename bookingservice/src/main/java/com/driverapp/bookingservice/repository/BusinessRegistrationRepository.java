package com.driverapp.bookingservice.repository;

import com.driverapp.bookingservice.models.BusinessRegistration;
import com.driverapp.bookingservice.models.enums.BusinessRegistrationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BusinessRegistrationRepository extends MongoRepository<BusinessRegistration, String> {

    /** 1 user chỉ có 1 đơn đăng ký kinh doanh duy nhất */
    Optional<BusinessRegistration> findByUserId(UUID userId);

    boolean existsByUserId(UUID userId);

    List<BusinessRegistration> findByStatus(BusinessRegistrationStatus status);
}
