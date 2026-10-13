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
     * GET /api/drivers/check-available/{driverId}
     * Booking-service gọi kiểm tra tài xế khả dụng (driverId chính là userId).
     * Response chỉ trả về driverId và status (đã bỏ trường userId thừa).
     */
    @GetMapping("/check-available/{driverId}")
    public DriverProfileResponse checkAvailable(@PathVariable UUID driverId) {
        return availabilityService.checkAndGetAvailableDriver(driverId);
    }

    /**
     * PATCH /api/drivers/availability
     * Booking-service cập nhật trạng thái hoạt động (ON_TRIP, AVAILABLE, ...)
     */
    @PatchMapping("/availability")
    public Map<String, String> updateAvailability(@Valid @RequestBody UpdateAvailabilityRequest request) {
        availabilityService.updateAvailability(request);
        return Map.of("message", "Driver availability updated successfully");
    }
}