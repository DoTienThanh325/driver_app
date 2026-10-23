package com.driverapp.driverservice.listener.saga;

import com.driverapp.driverservice.event.RoleGrantFailedPayload;
import com.driverapp.driverservice.models.SagaCompensationLog;
import com.driverapp.driverservice.models.enums.VerificationStatus;
import com.driverapp.driverservice.repository.DriverAvailabilityRepository;
import com.driverapp.driverservice.repository.DriverRepository;
import com.driverapp.driverservice.repository.SagaCompensationLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class DriverRoleRollbackListener {

    private final DriverRepository driverRepository;
    private final DriverAvailabilityRepository availabilityRepository;
    private final SagaCompensationLogRepository sagaLogRepository;

    @RabbitListener(queues = "role.grant.driver.failed.queue")
    @Transactional
    public void handleRoleGrantDriverFailed(RoleGrantFailedPayload payload) {
        log.warn("[SAGA #5] Nhận compensating event: driverId={}, userId={}. Bắt đầu rollback tài xế...",
                payload.getEntityId(), payload.getUserId());

        UUID userId = UUID.fromString(payload.getUserId());
        driverRepository.findByUserId(userId).ifPresentOrElse(driver -> {
            String beforeState = driver.getVerificationStatus() != null ? driver.getVerificationStatus().name() : "UNKNOWN";

            if (driver.getVerificationStatus() == VerificationStatus.APPROVED) {
                // 1. Rollback trạng thái driver về PENDING
                driver.setVerificationStatus(VerificationStatus.PENDING);
                driver.setApprovedAt(null);
                driverRepository.save(driver);

                // 2. Xóa hồ sơ availability đã lỡ tạo để tài xế không nhận cuốc
                availabilityRepository.deleteByDriver_UserId(userId);

                log.info("[SAGA #5] Đã rollback driver={} về PENDING và xóa DriverAvailability.", userId);

                sagaLogRepository.save(SagaCompensationLog.builder()
                        .sagaId("DRIVER-" + userId + "-ROLE_GRANT")
                        .sagaType("DRIVER_ROLE_ROLLBACK")
                        .entityId(userId.toString())
                        .beforeState(beforeState)
                        .afterState("PENDING")
                        .triggerEvent("role.grant.driver.failed")
                        .result("SUCCESS")
                        .notes("UserService cấp role DRIVER thất bại. Rollback hồ sơ tài xế.")
                        .build());
            }
        }, () -> log.error("[SAGA #5] Không tìm thấy driver với userId={} để rollback!", userId));
    }
}
