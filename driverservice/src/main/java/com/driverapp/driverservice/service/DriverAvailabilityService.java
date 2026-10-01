package com.driverapp.driverservice.service;

import com.driverapp.driverservice.dto.response.DriverAvailabilityResponse;

import java.util.UUID;

public interface DriverAvailabilityService {
    DriverAvailabilityResponse turnOnline(UUID userId);
    DriverAvailabilityResponse getDriverAvailability(UUID userId);
}
