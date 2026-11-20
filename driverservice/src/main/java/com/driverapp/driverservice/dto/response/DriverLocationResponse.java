package com.driverapp.driverservice.dto.response;

import java.util.UUID;

public record DriverLocationResponse(
    UUID driverId,
    Double latitude,
    Double longitude,
    Double heading,
    Double speed,
    String vehicleType,
    Long updatedAt
) {}
