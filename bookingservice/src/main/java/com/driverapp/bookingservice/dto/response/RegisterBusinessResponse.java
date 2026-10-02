package com.driverapp.bookingservice.dto.response;

public record RegisterBusinessResponse(
        String businessRegistrationId,
        String restaurantId,
        String status,
        String message
) {}
