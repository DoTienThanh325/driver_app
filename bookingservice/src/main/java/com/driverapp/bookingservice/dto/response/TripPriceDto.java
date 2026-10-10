package com.driverapp.bookingservice.dto.response;

import java.util.UUID;

public record TripPriceDto(
        String tripId,
        UUID customerId,
        UUID driverId,
        double shippFare,
        Double totalFoodPrice,
        String status
) {}
