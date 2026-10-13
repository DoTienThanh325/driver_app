package com.driverapp.driverservice.dto.response;

import java.util.UUID;

public record DriverProfileResponse(
    UUID driverId,
    String status // AVAILABLE
) {}