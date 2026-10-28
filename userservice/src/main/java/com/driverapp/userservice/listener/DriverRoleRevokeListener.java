package com.driverapp.userservice.listener;

import com.driverapp.userservice.event.DomainEvent;
import com.driverapp.userservice.event.DriverRegistrationUpdatedPayload;
import com.driverapp.userservice.models.ProcessedEvent;
import com.driverapp.userservice.repository.ProcessedEventRepository;
import com.driverapp.userservice.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class DriverRoleRevokeListener {

    private final UserService userService;
    private final ProcessedEventRepository processedEventRepository;

    @RabbitListener(queues = "driver.revoke-role.queue")
    public void handleDriverRegistrationUpdated(DomainEvent<DriverRegistrationUpdatedPayload> event) {
        // Idempotency check — tránh xử lý trùng khi RabbitMQ retry
        if (processedEventRepository.existsById(event.getEventId())) {
            log.info("[User] Bỏ qua event đã xử lý: {}", event.getEventId());
            return;
        }

        DriverRegistrationUpdatedPayload payload = event.getPayload();
        UUID userId = UUID.fromString(payload.getUserId());

        log.info("[User] Thu hồi role DRIVER của userId={} do driver cập nhật hồ sơ", userId);
        userService.revokeRole(userId, "DRIVER");

        processedEventRepository.save(ProcessedEvent.builder()
                .eventId(event.getEventId())
                .eventType(event.getEventType())
                .consumerName("DriverRoleRevokeListener")
                .build());
    }
}
