package com.driverapp.driverservice.service;

import com.driverapp.driverservice.dto.request.UpdateDriverLocationRequest;
import com.driverapp.driverservice.dto.response.NearbyDriverResponse;
import com.driverapp.driverservice.models.enums.VehicleType;

import java.util.List;
import java.util.UUID;

public interface DriverLocationService {
    void updateLocation(UUID driverUserId, UpdateDriverLocationRequest request);
    List<NearbyDriverResponse> findNearbyDrivers(Double lat, Double lng, Double radiusKm, VehicleType vehicleType, Integer limit);
}
