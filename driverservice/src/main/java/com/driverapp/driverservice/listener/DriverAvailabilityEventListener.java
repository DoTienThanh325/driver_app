package com.driverapp.driverservice.listener;

import com.driverapp.driverservice.event.DomainEvent;
import com.driverapp.driverservice.event.DriverAvailabilityFailedPayload;
import com.driverapp.driverservice.event.TripEventPayload;
import com.driverapp.driverservice.models.DriverAvailability;
import com.driverapp.driverservice.models.ProcessedEvent;
import com.driverapp.driverservice.models.enums.AvailabilityStatus;
import com.driverapp.driverservice.repository.DriverAvailabilityRepository;
import com.driverapp.driverservice.repository.ProcessedEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class DriverAvailabilityEventListener {

    private final DriverAvailabilityRepository availabilityRepository;
    private final ProcessedEventRepository processedEventRepository;
    private final RabbitTemplate rabbitTemplate;

    @RabbitListener(queues = "driver.availability-update.queue")
    @Transactional
    public void handleTripStatusChanged(DomainEvent<TripEventPayload> event) {
        if (processedEventRepository.existsById(event.getEventId())) {
            log.info("[Deduplication] Bỏ qua event đã xử lý: {}", event.getEventId());
            return;
        }

        TripEventPayload payload = event.getPayload();
        if (payload.getDriverId() == null) {
            return;
        }

        UUID driverUserId = UUID.fromString(payload.getDriverId());
        DriverAvailability availability = availabilityRepository.findByDriverId(driverUserId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy DriverAvailability cho driverId=" + driverUserId));

        AvailabilityStatus targetStatus;
        switch (payload.getTripStatus()) {
            case "DRIVER_ASSIGNED":
            case "DRIVER_ARRIVING":
            case "IN_PROGRESS":
                targetStatus = AvailabilityStatus.ON_TRIP;
                break;
            case "COMPLETED":
            case "CANCELLED":
                targetStatus = AvailabilityStatus.AVAILABLE;
                break;
            default:
                return;
        }

        availabilityRepository.save(availability.withStatus(targetStatus));
        processedEventRepository.save(ProcessedEvent.builder()
                .eventId(event.getEventId())
                .eventType(event.getEventType())
                .consumerName("DriverAvailabilityEventListener")
                .build());

        log.info("[Availability] Cập nhật thành công driverId={} sang status={}", driverUserId, targetStatus);
    }

    /**
     * SAGA Compensating Trigger: Khi retry hết 3 lần mà vẫn lỗi, message rơi vào DLQ.
     * Listener này đón DLQ và phát event "driver.availability.failed" để BookingService rollback.
     */
    @RabbitListener(queues = "driver.availability-update.dlq")
    public void handleAvailabilityUpdateFailure(DomainEvent<TripEventPayload> event) {
        TripEventPayload payload = event.getPayload();
        log.error("[SAGA #3] Phát hiện thất bại cập nhật availability sau maxRetry cho tripId={}, driverId={}. Phát compensating event!",
                payload.getTripId(), payload.getDriverId());

        DriverAvailabilityFailedPayload failedPayload = DriverAvailabilityFailedPayload.builder()
                .tripId(payload.getTripId())
                .driverId(payload.getDriverId())
                .targetStatus("ON_TRIP")
                .reason("Lỗi DB hoặc không tìm thấy tài xế khi nhận cuốc.")
                .originalEventRoutingKey(event.getEventType())
                .build();

        rabbitTemplate.convertAndSend("saga.compensating.exchange", "driver.availability.failed", failedPayload);
    }
}
