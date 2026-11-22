package com.driverapp.bookingservice.dto.response;

import com.driverapp.bookingservice.models.enums.VehicleType;

public record TripCounterpartyResponse(
        Role role,
        String displayName,
        String phoneNumber,
        VehicleType vehicleType,
        Double averageRating
) {
    public enum Role { CUSTOMER, DRIVER }
}
