package com.driverapp.userservice.listener;

import com.driverapp.userservice.event.BusinessReviewedPayload;
import com.driverapp.userservice.event.DomainEvent;
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
public class BusinessRoleGrantListener {

    private final UserService userService;
    private final ProcessedEventRepository processedEventRepository;
    private final RabbitTemplate rabbitTemplate;

    @RabbitListener(queues = "business.role-grant.queue")
    public void handleBusinessReviewed(DomainEvent<BusinessReviewedPayload> event) {
        if (processedEventRepository.existsById(event.getEventId())) {
            log.info("[User] Bỏ qua event đã xử lý: {}", event.getEventId());
            return;
        }

        BusinessReviewedPayload payload = event.getPayload();
        UUID userId = UUID.fromString(payload.getBusinessUserId());

        if ("ACCEPTED".equalsIgnoreCase(payload.getReviewStatus())) {
            log.info("[User] Cấp role BUSINESS cho userId={}", userId);
            userService.grantRole(userId, "BUSINESS");
        } else if ("BANNED".equalsIgnoreCase(payload.getReviewStatus())) {
            log.info("[User] Thu hồi role BUSINESS của userId={}", userId);
            userService.revokeRole(userId, "BUSINESS");
        }

        processedEventRepository.save(ProcessedEvent.builder()
                .eventId(event.getEventId())
                .eventType(event.getEventType())
                .consumerName("BusinessRoleGrantListener")
                .build());
    }

    /**
     * SAGA Compensating Trigger: Khi cấp role BUSINESS lỗi sau 3 retry
     */
    @RabbitListener(queues = "business.role-grant.dlq")
    public void handleBusinessRoleFailure(DomainEvent<BusinessReviewedPayload> event) {
        BusinessReviewedPayload payload = event.getPayload();
        log.error("[SAGA #4] Thất bại cấp role BUSINESS sau maxRetry. bookingId={}, userId={}. Phát compensating event!",
                payload.getBookingId(), payload.getBusinessUserId());

        RoleGrantFailedPayload failedPayload = RoleGrantFailedPayload.builder()
                .entityId(payload.getBookingId())
                .userId(payload.getBusinessUserId())
                .targetRole("BUSINESS")
                .reason("Lỗi phân quyền DB trong UserService sau 3 lần retry.")
                .build();

        rabbitTemplate.convertAndSend("saga.compensating.exchange", "role.grant.business.failed", failedPayload);
    }
}
