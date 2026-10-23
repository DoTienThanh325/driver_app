package com.driverapp.bookingservice.listener.saga;

import com.driverapp.bookingservice.event.RoleGrantFailedPayload;
import com.driverapp.bookingservice.models.SagaCompensationLog;
import com.driverapp.bookingservice.models.enums.BusinessRegistrationStatus;
import com.driverapp.bookingservice.repository.BusinessRepository;
import com.driverapp.bookingservice.repository.SagaCompensationLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class BusinessRoleRollbackListener {

    private final BusinessRepository businessRepository;
    private final SagaCompensationLogRepository sagaLogRepository;

    @RabbitListener(queues = "role.grant.business.failed.queue")
    public void handleRoleGrantBusinessFailed(RoleGrantFailedPayload payload) {
        log.warn("[SAGA #4] Nhận compensating event cấp quyền Business thất bại: bookingId={}, userId={}",
                payload.getEntityId(), payload.getUserId());

        businessRepository.findById(payload.getEntityId()).ifPresentOrElse(booking -> {
            String beforeState = booking.getStatus() != null ? booking.getStatus().name() : "UNKNOWN";

            if (booking.getStatus() == BusinessRegistrationStatus.ACCEPTED) {
                booking.setStatus(BusinessRegistrationStatus.PENDING);
                booking.setUpdatedAt(LocalDateTime.now());
                businessRepository.save(booking);

                log.info("[SAGA #4] Đã rollback Business booking={} từ ACCEPTED về PENDING", payload.getEntityId());

                sagaLogRepository.save(SagaCompensationLog.builder()
                        .sagaId("BUSINESS-" + payload.getEntityId() + "-ROLE_GRANT")
                        .sagaType("BUSINESS_ROLE_ROLLBACK")
                        .entityId(payload.getEntityId())
                        .beforeState(beforeState)
                        .afterState("PENDING")
                        .triggerEvent("role.grant.business.failed")
                        .result("SUCCESS")
                        .notes("UserService cấp role BUSINESS thất bại. Đưa về PENDING để Admin xử lý lại.")
                        .build());
            }
        }, () -> {
            log.error("[SAGA #4] Không tìm thấy Business bookingId={} để rollback", payload.getEntityId());
        });
    }
}
