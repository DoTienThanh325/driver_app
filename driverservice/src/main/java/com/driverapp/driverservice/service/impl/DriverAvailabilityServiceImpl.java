package com.driverapp.driverservice.service.impl;

import com.driverapp.driverservice.dto.request.UpdateAvailabilityRequest;
import com.driverapp.driverservice.dto.response.DriverProfileResponse;
import com.driverapp.driverservice.models.Driver;
import com.driverapp.driverservice.models.DriverAvailability;
import com.driverapp.driverservice.models.enums.AvailabilityStatus;
import com.driverapp.driverservice.models.enums.VerificationStatus;
import com.driverapp.driverservice.repository.DriverAvailabilityRepository;
import com.driverapp.driverservice.repository.DriverRepository;
import com.driverapp.driverservice.service.DriverAvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DriverAvailabilityServiceImpl implements DriverAvailabilityService {

    private final DriverRepository driverRepository;
    private final DriverAvailabilityRepository availabilityRepository;

    @Override
    @Transactional(readOnly = true)
    public DriverProfileResponse checkAndGetAvailableDriver(UUID userId) {
        // 1. Find driver profile by userId
        Driver driver = driverRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Driver profile not found for user: " + userId));

        if (driver.getVerificationStatus() != VerificationStatus.APPROVED) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Driver profile is not approved yet (status: " + driver.getVerificationStatus() + ")");
        }

        // 2. Find driver availability by driverId
        DriverAvailability availability = availabilityRepository.findByDriverId(driver.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Driver availability is not initialized"));

        if (availability.getStatus() != AvailabilityStatus.AVAILABLE) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Driver is not currently in AVAILABLE status (status: " + availability.getStatus() + ")");
        }

        // 3. Return driverId
        return new DriverProfileResponse(
                driver.getId(),
                driver.getUserId(),
                availability.getStatus().name());
    }

    @Override
    @Transactional
    public void updateAvailability(UpdateAvailabilityRequest request) {
        AvailabilityStatus newStatus;
        try {
            newStatus = AvailabilityStatus.valueOf(request.status());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + request.status());
        }

        // Update directly by driverId
        DriverAvailability availability = availabilityRepository.findByDriverId(request.driverId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Availability not found for driverId: " + request.driverId()));

        availabilityRepository.save(availability.withStatus(newStatus));
    }
}