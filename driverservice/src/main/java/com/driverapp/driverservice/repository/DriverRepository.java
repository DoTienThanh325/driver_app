package com.driverapp.driverservice.repository;

import com.driverapp.driverservice.models.Driver;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DriverRepository extends JpaRepository<Driver, UUID> {
    boolean existsByUserId(UUID userId);
    
    Optional<Driver> findByUserId(UUID userId);
}
