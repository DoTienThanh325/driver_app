package com.driverapp.driverservice.service;

import com.driverapp.driverservice.dto.request.UpdateVerificationRequest;

import java.util.UUID;

public interface DriverVerificationService {
    void updateVerification(UUID driverId, UpdateVerificationRequest request);
}
