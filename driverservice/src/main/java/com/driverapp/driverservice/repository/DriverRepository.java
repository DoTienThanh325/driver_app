package com.driverapp.driverservice.repository;

import com.driverapp.driverservice.models.Driver;
import com.driverapp.driverservice.models.enums.VerificationStatus;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DriverRepository extends JpaRepository<Driver, UUID> {
    boolean existsByUserId(UUID userId);
    
    Optional<Driver> findByUserId(UUID userId);

    List<Driver> findByVerificationStatusOrderByCreatedAtDesc(VerificationStatus status);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "UPDATE drivers SET average_rating = :rating WHERE user_id = :userId", nativeQuery = true)
    void updateAverageRating(@org.springframework.data.repository.query.Param("userId") UUID userId, @org.springframework.data.repository.query.Param("rating") Double rating);
}
