package com.driverapp.bookingservice.dto.response;

import java.util.UUID;

public record NearbyDriverDto(
        UUID driverUserId,
        Double latitude,
        Double longitude,
        Double distanceKm,
        String vehicleType
) {}
