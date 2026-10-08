package com.driverapp.bookingservice.dto.response;

import java.util.UUID;

public record CustomerTripCountDto(
        UUID customerId,
        long completedTrips
) {}
