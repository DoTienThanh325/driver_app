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
        // 1. Tìm hồ sơ Driver từ userId
        Driver driver = driverRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy hồ sơ tài xế cho user: " + userId));

        if (driver.getVerificationStatus() != VerificationStatus.APPROVED) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Hồ sơ tài xế chưa được duyệt (trạng thái: " + driver.getVerificationStatus() + ")");
        }

        // 2. Tìm trạng thái availability theo driverId
        DriverAvailability availability = availabilityRepository.findByDriverId(driver.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Chưa thiết lập trạng thái hoạt động cho tài xế"));

        if (availability.getStatus() != AvailabilityStatus.AVAILABLE) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Tài xế đang không ở trạng thái AVAILABLE (trạng thái: " + availability.getStatus() + ")");
        }

        // 3. Trả về đúng driverId (id bảng drivers)
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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status không hợp lệ: " + request.status());
        }

        // Cập nhật trực tiếp theo driverId
        DriverAvailability availability = availabilityRepository.findByDriverId(request.driverId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy availability cho driverId: " + request.driverId()));

        availabilityRepository.save(availability.withStatus(newStatus));
    }
}