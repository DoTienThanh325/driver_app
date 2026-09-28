package com.driverapp.driverservice.repository;

import com.driverapp.driverservice.models.DriverVehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DriverVehicleRepository extends JpaRepository<DriverVehicle, UUID> {

}
