package com.driverapp.driverservice.dto.response;

import com.driverapp.driverservice.models.enums.VehicleType;
import java.util.UUID;

public record NearbyDriverResponse(
        UUID driverUserId,
        Double latitude,
        Double longitude,
        Double distanceKm,
        VehicleType vehicleType
) {}
