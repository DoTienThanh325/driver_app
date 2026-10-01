package com.driverapp.driverservice.dto.response;

import java.util.UUID;

public record DriverProfileResponse(
    UUID driverId,
    UUID userId,
    String status // AVAILABLE
) {}