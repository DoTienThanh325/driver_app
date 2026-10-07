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

    Optional<DriverVehicle> findFirstByDriverOrderByCreatedAtDesc(Driver driver);
}
