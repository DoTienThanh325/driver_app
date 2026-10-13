package com.driverapp.driverservice.repository;

import com.driverapp.driverservice.models.DriverAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface DriverAvailabilityRepository extends JpaRepository<DriverAvailability, UUID> {
    // Tìm availability theo driverId (chính là userId)
    @Query("SELECT da FROM DriverAvailability da WHERE da.driver.userId = :driverId")
    Optional<DriverAvailability> findByDriverId(@Param("driverId") UUID driverId);

    Optional<DriverAvailability> findByDriver_UserId(UUID userId);
}