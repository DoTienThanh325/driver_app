package com.driverapp.driverservice.dto.response;

import com.driverapp.driverservice.models.enums.VehicleType;
import com.driverapp.driverservice.models.enums.VerificationStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record DriverDetailResponse(
        UUID driverId,
        String username,
        String phoneNumber,
        VerificationStatus verificationStatus,
        LocalDateTime createdAt,
        DocumentImagePair idCard,
        DocumentImagePair license,
        DocumentImagePair licenseMotorbike,
        DocumentImagePair licenseCar,
        VehicleDetail vehicle,
        List<VehicleDetail> vehicles
) {
    public record DocumentImagePair(
            String front,
            String back
    ) {}

    public record VehicleDetail(
            UUID id,
            VehicleType vehicleType,
            String registrationFront,
            String plate,
            VerificationStatus status,
            LocalDateTime createdAt
    ) {}
}
