package com.driverapp.bookingservice.dto.response;

public record AcceptTripResponse(
    String tripId,
    String status,
    String message
) {}