package com.driverapp.driverservice.controller;

import com.driverapp.driverservice.dto.request.UpdateAvailabilityRequest;
import com.driverapp.driverservice.dto.response.DriverProfileResponse;
import com.driverapp.driverservice.service.DriverAvailabilityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/drivers")
@RequiredArgsConstructor
public class DriverAvailabilityController {

    private final DriverAvailabilityService availabilityService;

    /**
     * GET /api/drivers/check-available/{userId}
     * Booking-service gọi để kiểm tra và lấy driverId
     */
    @GetMapping("/check-available/{userId}")
    public DriverProfileResponse checkAvailable(@PathVariable UUID userId) {
        return availabilityService.checkAndGetAvailableDriver(userId);
    }

    /**
     * PATCH /api/drivers/availability
     * Booking-service gọi để đổi sang ON_TRIP
     */
    @PatchMapping("/availability")
    public Map<String, String> updateAvailability(@Valid @RequestBody UpdateAvailabilityRequest request) {
        availabilityService.updateAvailability(request);
        return Map.of("message", "Cập nhật trạng thái tài xế thành công");
    }
}