package com.driverapp.userservice.listener;

import com.driverapp.userservice.event.DomainEvent;
import com.driverapp.userservice.event.DriverApprovedPayload;
import com.driverapp.userservice.event.RoleGrantFailedPayload;
import com.driverapp.userservice.models.ProcessedEvent;
import com.driverapp.userservice.repository.ProcessedEventRepository;
import com.driverapp.userservice.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class DriverRoleGrantListener {

    private final UserService userService;
    private final ProcessedEventRepository processedEventRepository;
    private final RabbitTemplate rabbitTemplate;

    @RabbitListener(queues = "driver.role-grant.queue")
    public void handleDriverApproved(DomainEvent<DriverApprovedPayload> event) {
        if (processedEventRepository.existsById(event.getEventId())) {
            log.info("[User] Bỏ qua event đã xử lý: {}", event.getEventId());
            return;
        }

        DriverApprovedPayload payload = event.getPayload();
        UUID userId = UUID.fromString(payload.getUserId());
        log.info("[User] Cấp role DRIVER cho userId={}", userId);
        userService.grantRole(userId, "DRIVER");

        processedEventRepository.save(ProcessedEvent.builder()
                .eventId(event.getEventId())
                .eventType(event.getEventType())
                .consumerName("DriverRoleGrantListener")
                .build());
    }

    /**
     * SAGA Compensating Trigger: Khi cấp role DRIVER lỗi sau 3 retry
     */
    @RabbitListener(queues = "driver.role-grant.dlq")
    public void handleDriverRoleFailure(DomainEvent<DriverApprovedPayload> event) {
        DriverApprovedPayload payload = event.getPayload();
        log.error("[SAGA #5] Thất bại cấp role DRIVER sau maxRetry. driverId={}, userId={}. Phát compensating event!",
                payload.getDriverId(), payload.getUserId());

        RoleGrantFailedPayload failedPayload = RoleGrantFailedPayload.builder()
                .entityId(payload.getDriverId())
                .userId(payload.getUserId())
                .targetRole("DRIVER")
                .reason("Lỗi phân quyền DB trong UserService sau 3 lần retry.")
                .build();

        rabbitTemplate.convertAndSend("saga.compensating.exchange", "role.grant.driver.failed", failedPayload);
    }
}
