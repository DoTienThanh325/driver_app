package com.driverapp.driverservice.service.impl;

import com.driverapp.driverservice.client.UserServiceClient;
import com.driverapp.driverservice.dto.request.UpdateVerificationRequest;
import com.driverapp.driverservice.models.Driver;
import com.driverapp.driverservice.models.DriverAvailability;
import com.driverapp.driverservice.models.enums.AvailabilityStatus;
import com.driverapp.driverservice.models.enums.VerificationStatus;
import com.driverapp.driverservice.repository.DriverAvailabilityRepository;
import com.driverapp.driverservice.repository.DriverRepository;
import com.driverapp.driverservice.service.DriverVerificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DriverVerificationServiceImpl implements DriverVerificationService {

    private static final String DRIVER_ROLE = "DRIVER";

    private final DriverRepository driverRepository;
    private final DriverAvailabilityRepository availabilityRepository;
    private final UserServiceClient userServiceClient;

    @Override
    @Transactional
    public void updateVerification(UUID driverId, UpdateVerificationRequest request) {
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Driver not found with id: " + driverId));

        if (driver.getVerificationStatus() == VerificationStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Driver with APPROVED status cannot be updated");
        }

        switch (request.status()) {
            case APPROVED -> approve(driver);
            case REJECTED -> reject(driver, request.rejectionReason());
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "status must be either APPROVED or REJECTED");
        }
    }

    private void approve(Driver driver) {
        // Step 1: Admin approves => update driver status to APPROVED
        driver.approve();
        driverRepository.save(driver);

        // Step 2: driver-service creates driver_availability with status OFFLINE
        if (availabilityRepository.findByDriverId(driver.getId()).isEmpty()) {
            availabilityRepository.save(DriverAvailability.builder()
                    .driver(driver)
                    .status(AvailabilityStatus.OFFLINE)
                    .build());
        }

        // Step 3: driver-service calls user-service to assign DRIVER role
        userServiceClient.grantRole(driver.getUserId(), DRIVER_ROLE);

        log.info("Driver approved successfully: driverId={}, userId={}", driver.getId(), driver.getUserId());
    }

    private void reject(Driver driver, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "rejectionReason is required when status is REJECTED");
        }
        driver.reject(reason.trim());
        driverRepository.save(driver);
        log.info("Driver rejected successfully: driverId={}", driver.getId());
    }
}
