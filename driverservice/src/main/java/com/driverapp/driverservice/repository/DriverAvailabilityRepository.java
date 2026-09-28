package com.driverapp.driverservice.repository;

import com.driverapp.driverservice.models.DriverAvailability;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DriverAvailabilityRepository extends JpaRepository<DriverAvailability, UUID> {
}
