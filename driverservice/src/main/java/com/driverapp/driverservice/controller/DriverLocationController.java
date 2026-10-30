package com.driverapp.driverservice.controller;

import com.driverapp.driverservice.dto.request.UpdateDriverLocationRequest;
import com.driverapp.driverservice.dto.response.NearbyDriverResponse;
import com.driverapp.driverservice.models.enums.VehicleType;
import com.driverapp.driverservice.service.DriverLocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/drivers")
@RequiredArgsConstructor
public class DriverLocationController {

    private final DriverLocationService locationService;

    /**
     * Tài xế gửi tọa độ GPS định kỳ (Yêu cầu JWT)
     */
    @PostMapping("/location")
    public ResponseEntity<Map<String, String>> updateLocation(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateDriverLocationRequest request) {
        UUID driverUserId = UUID.fromString(jwt.getSubject());
        locationService.updateLocation(driverUserId, request);
        return ResponseEntity.ok(Map.of("message", "Location updated successfully"));
    }

    /**
     * Endpoint nội bộ cho Booking Service tìm các tài xế gần
     */
    @GetMapping("/nearby")
    public ResponseEntity<List<NearbyDriverResponse>> getNearbyDrivers(
            @RequestParam("lat") Double lat,
            @RequestParam("lng") Double lng,
            @RequestParam(value = "radiusKm", defaultValue = "3.0") Double radiusKm,
            @RequestParam(value = "vehicleType", required = false) VehicleType vehicleType,
            @RequestParam(value = "limit", defaultValue = "40") Integer limit) {
        List<NearbyDriverResponse> nearbyDrivers = locationService.findNearbyDrivers(lat, lng, radiusKm, vehicleType, limit);
        return ResponseEntity.ok(nearbyDrivers);
    }
}
