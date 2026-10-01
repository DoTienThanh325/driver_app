package com.driverapp.bookingservice.dto.request;

public record RestaurantRequest(
        String name,
        String locationAddress,
        String locationLatitude,
        String locationLongitude
) {}
