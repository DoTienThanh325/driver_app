package com.driverapp.driverservice.repository;

import com.driverapp.driverservice.models.Driver;
import com.driverapp.driverservice.models.DriverAvailability;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DriverAvailabilityRepository extends JpaRepository<DriverAvailability, UUID> {
    // Tìm availability theo userId (join qua bảng drivers, PK là user_id)
    Optional<DriverAvailability> findByDriver_UserId(UUID userId);

    Optional<DriverAvailability> findByDriver(Driver driver);
}
