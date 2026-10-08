package com.driverapp.paymentservice.dto.internal;

import java.util.UUID;

public record CustomerTripCountDto(
        UUID customerId,
        long completedTrips
) {}
