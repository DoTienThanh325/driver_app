package com.driverapp.driverservice.controller;

import com.driverapp.driverservice.dto.response.DriverAvailabilityResponse;
import com.driverapp.driverservice.service.DriverAvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/drivers")
@RequiredArgsConstructor
public class DriverAvailabilityController {

    private final DriverAvailabilityService driverAvailabilityService;

    @PostMapping("/online")
    public ResponseEntity<DriverAvailabilityResponse> turnOnline(
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(driverAvailabilityService.turnOnline(userId));
    }

    @GetMapping("/status/me")
    public ResponseEntity<DriverAvailabilityResponse> getDriverStatus(
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(driverAvailabilityService.getDriverAvailability(userId));
    }
}
