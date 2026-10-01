package com.driverapp.driverservice.service.impl;

import com.driverapp.driverservice.dto.response.DriverAvailabilityResponse;
import com.driverapp.driverservice.models.Driver;
import com.driverapp.driverservice.models.DriverAvailability;
import com.driverapp.driverservice.models.enums.AvailabilityStatus;
import com.driverapp.driverservice.models.enums.VerificationStatus;
import com.driverapp.driverservice.repository.DriverAvailabilityRepository;
import com.driverapp.driverservice.repository.DriverRepository;
import com.driverapp.driverservice.service.DriverAvailabilityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DriverAvailabilityServiceImpl implements DriverAvailabilityService {

    public static final String REDIS_KEY_DRIVER_STATUS_PREFIX = "driver:status:";

    private final DriverRepository driverRepository;
    private final DriverAvailabilityRepository driverAvailabilityRepository;
    private final StringRedisTemplate redisTemplate;

    @Override
    @Transactional
    public DriverAvailabilityResponse turnOnline(UUID userId) {
        Driver driver = getDriverByUserId(userId);

        if (driver.getVerificationStatus() != VerificationStatus.APPROVED) {
            throw new IllegalStateException("Tài xế chưa được phê duyệt, không thể bật chế độ online");
        }

        DriverAvailability availability = driverAvailabilityRepository.findByDriver(driver)
                .orElseGet(() -> DriverAvailability.builder()
                        .driver(driver)
                        .status(AvailabilityStatus.OFFLINE)
                        .build());

        availability.setStatus(AvailabilityStatus.AVAILABLE);
        driverAvailabilityRepository.save(availability);

        updateRedisStatus(driver.getId(), AvailabilityStatus.AVAILABLE);

        return DriverAvailabilityResponse.builder()
                .driverId(driver.getId())
                .userId(driver.getUserId())
                .status(AvailabilityStatus.AVAILABLE)
                .online(true)
                .verificationStatus(driver.getVerificationStatus())
                .message("Bật chế độ online thành công")
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public DriverAvailabilityResponse getDriverAvailability(UUID userId) {
        Driver driver = getDriverByUserId(userId);
        DriverAvailability availability = driverAvailabilityRepository.findByDriver(driver)
                .orElseGet(() -> DriverAvailability.builder()
                        .driver(driver)
                        .status(AvailabilityStatus.OFFLINE)
                        .build());

        boolean isOnline = availability.getStatus() == AvailabilityStatus.AVAILABLE || availability.getStatus() == AvailabilityStatus.ON_TRIP;

        return DriverAvailabilityResponse.builder()
                .driverId(driver.getId())
                .userId(driver.getUserId())
                .status(availability.getStatus())
                .online(isOnline)
                .verificationStatus(driver.getVerificationStatus())
                .message("Lấy trạng thái tài xế thành công")
                .build();
    }

    private Driver getDriverByUserId(UUID userId) {
        return driverRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy dữ liệu tài xế cho user ID: " + userId));
    }

    private void updateRedisStatus(UUID driverId, AvailabilityStatus status) {
        try {
            redisTemplate.opsForValue().set(REDIS_KEY_DRIVER_STATUS_PREFIX + driverId, status.name());
        } catch (Exception e) {
            log.error("Lỗi khi cập nhật trạng thái tài xế lên Redis: ", e);
        }
    }
}
