package com.driverapp.driverservice.service;

import java.util.UUID;

import com.driverapp.driverservice.dto.request.AddVehicleRequest;
import com.driverapp.driverservice.dto.response.AddVehicleResponse;

public interface DriverVehicleService {
    AddVehicleResponse addVehicle(UUID userId, AddVehicleRequest request);
}
