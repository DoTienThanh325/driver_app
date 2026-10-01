package com.driverapp.driverservice.service.impl;

import com.driverapp.driverservice.client.NotificationClient;
import com.driverapp.driverservice.client.UserServiceClient;
import com.driverapp.driverservice.dto.response.DriverApprovalResponse;
import com.driverapp.driverservice.models.Driver;
import com.driverapp.driverservice.models.DriverAvailability;
import com.driverapp.driverservice.models.enums.AvailabilityStatus;
import com.driverapp.driverservice.models.enums.VerificationStatus;
import com.driverapp.driverservice.repository.DriverAvailabilityRepository;
import com.driverapp.driverservice.repository.DriverRepository;
import com.driverapp.driverservice.service.DriverApprovalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DriverApprovalServiceImpl implements DriverApprovalService {

    private final DriverRepository driverRepository;
    private final DriverAvailabilityRepository driverAvailabilityRepository;
    private final UserServiceClient userServiceClient;
    private final NotificationClient notificationClient;

    @Override
    @Transactional
    public DriverApprovalResponse approveDriver(UUID driverIdOrUserId) {
        Driver driver = driverRepository.findById(driverIdOrUserId)
                .orElseGet(() -> driverRepository.findByUserId(driverIdOrUserId)
                        .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài xế với ID: " + driverIdOrUserId)));

        // Bước 1: Cập nhật trạng thái driver => APPROVED
        LocalDateTime now = LocalDateTime.now();
        driver.setVerificationStatus(VerificationStatus.APPROVED);
        driver.setApprovedAt(now);
        driver.setRejectionReason(null);
        driverRepository.save(driver);
        log.info("Cập nhật trạng thái tài xế thành APPROVED cho driverId: {}", driver.getId());

        // Bước 2: Tạo hoặc cập nhật driver_availability với status OFFLINE
        DriverAvailability availability = driverAvailabilityRepository.findByDriver(driver)
                .orElseGet(() -> DriverAvailability.builder()
                        .driver(driver)
                        .status(AvailabilityStatus.OFFLINE)
                        .build());
        availability.setStatus(AvailabilityStatus.OFFLINE);
        driverAvailabilityRepository.save(availability);
        log.info("Tạo/cập nhật driver_availability thành OFFLINE cho driverId: {}", driver.getId());

        // Bước 3: Gọi user-service tạo user_roles (userId + role DRIVER)
        userServiceClient.assignRoleToUser(driver.getUserId(), "DRIVER");

        // Bước 4: Gửi thông báo cho tài xế qua notification-service
        notificationClient.sendNotification(
                driver.getUserId(),
                "Hồ sơ Tài xế đã được phê duyệt",
                "Chúc mừng! Hồ sơ đăng ký làm tài xế của bạn đã được Admin phê duyệt. Bạn có thể bật chế độ Online để bắt đầu nhận chuyến."
        );

        return DriverApprovalResponse.builder()
                .driverId(driver.getId())
                .userId(driver.getUserId())
                .verificationStatus(driver.getVerificationStatus())
                .approvedAt(driver.getApprovedAt())
                .message("Duyệt tài xế thành công")
                .build();
    }
}
