package com.driverapp.driverservice.service.impl;

import com.driverapp.driverservice.dto.request.UpdateAvailabilityRequest;
import com.driverapp.driverservice.dto.response.DriverProfileResponse;
import com.driverapp.driverservice.models.DriverAvailability;
import com.driverapp.driverservice.models.enums.AvailabilityStatus;
import com.driverapp.driverservice.repository.DriverAvailabilityRepository;
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

    private final DriverAvailabilityRepository availabilityRepository;

    @Override
    @Transactional(readOnly = true)
    public DriverProfileResponse checkAndGetAvailableDriver(UUID driverId) {
        // BỎ VIỆC QUERY DRIVER: Tìm trực tiếp availability theo driverId (chính là userId)
        DriverAvailability availability = availabilityRepository.findByDriverId(driverId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Hồ sơ tài xế chưa được duyệt hoặc chưa kích hoạt availability cho driverId: " + driverId));

        if (availability.getStatus() != AvailabilityStatus.AVAILABLE) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Tài xế hiện không ở trạng thái AVAILABLE (status: " + availability.getStatus() + ")");
        }

        // Response chỉ trả về driverId (mang giá trị userId) và status
        return new DriverProfileResponse(
                driverId,
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

        // Cập nhật availability trực tiếp theo driverId (userId), không cần query bảng drivers
        DriverAvailability availability = availabilityRepository.findByDriverId(request.driverId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Availability not found for driverId: " + request.driverId()));

        availabilityRepository.save(availability.withStatus(newStatus));
    }
}