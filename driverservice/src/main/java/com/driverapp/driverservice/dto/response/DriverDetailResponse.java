package com.driverapp.driverservice.dto.response;

import com.driverapp.driverservice.models.enums.VehicleType;
import com.driverapp.driverservice.models.enums.VerificationStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record DriverDetailResponse(
        UUID driverId,
        String username,
        String phoneNumber,
        VerificationStatus verificationStatus,
        LocalDateTime createdAt,
        DocumentImagePair idCard,
        DocumentImagePair license,
        VehicleDetail vehicle
) {
    public record DocumentImagePair(
            String front,
            String back
    ) {}

    public record VehicleDetail(
            VehicleType vehicleType,
            String registrationFront,
            String plate
    ) {}
}
