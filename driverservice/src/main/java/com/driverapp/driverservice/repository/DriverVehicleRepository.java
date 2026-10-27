package com.driverapp.driverservice.repository;

import com.driverapp.driverservice.models.Driver;
import com.driverapp.driverservice.models.DriverVehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DriverVehicleRepository extends JpaRepository<DriverVehicle, UUID> {
    long countByDriver(Driver driver);

    List<DriverVehicle> findByDriver(Driver driver);

    List<DriverVehicle> findByDriverOrderByCreatedAtDesc(Driver driver);

    Optional<DriverVehicle> findFirstByDriverOrderByCreatedAtDesc(Driver driver);

    // Truy vấn trực tiếp theo userId
    long countByDriver_UserId(UUID userId);

    List<DriverVehicle> findByDriver_UserId(UUID userId);

    List<DriverVehicle> findByDriver_UserIdOrderByCreatedAtDesc(UUID userId);

    Optional<DriverVehicle> findFirstByDriver_UserIdOrderByCreatedAtDesc(UUID userId);
}
