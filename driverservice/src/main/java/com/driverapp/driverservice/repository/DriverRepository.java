package com.driverapp.driverservice.repository;

import com.driverapp.driverservice.models.Driver;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DriverRepository extends JpaRepository<Driver, UUID> {

}
