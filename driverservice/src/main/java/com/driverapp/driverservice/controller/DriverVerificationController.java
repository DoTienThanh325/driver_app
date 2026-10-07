package com.driverapp.driverservice.controller;

import com.driverapp.driverservice.dto.request.UpdateVerificationRequest;
import com.driverapp.driverservice.service.DriverVerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/drivers")
@RequiredArgsConstructor
public class DriverVerificationController {

    private final DriverVerificationService verificationService;

    @PatchMapping(value = "/{driverId}/verification-status")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, String> updateVerification(
            @PathVariable UUID driverId,
            @Valid @RequestBody UpdateVerificationRequest request) {
        verificationService.updateVerification(driverId, request);
        return Map.of("Message", "Driver verification has been updated successfully");
    }
}
