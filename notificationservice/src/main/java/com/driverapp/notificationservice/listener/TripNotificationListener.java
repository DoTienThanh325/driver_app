package com.driverapp.notificationservice.listener;

import com.driverapp.notificationservice.dto.request.CreateNotificationRequest;
import com.driverapp.notificationservice.event.DomainEvent;
import com.driverapp.notificationservice.event.TripEventPayload;
import com.driverapp.notificationservice.models.ProcessedEvent;
import com.driverapp.notificationservice.repository.ProcessedEventRepository;
import com.driverapp.notificationservice.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class TripNotificationListener {

    private final NotificationService notificationService;
    private final ProcessedEventRepository processedEventRepository;

    @RabbitListener(containerFactory = "resilienceRabbitListenerContainerFactory", queues = "trip.notification.queue")
    @org.springframework.transaction.annotation.Transactional
    public void handleTripNotification(DomainEvent<TripEventPayload> event) {
        if (processedEventRepository.existsById(event.getEventId())) {
            log.info("[Notification] Bỏ qua event đã push: {}", event.getEventId());
            return;
        }

        TripEventPayload payload = event.getPayload();
        String message = String.format("Chuyến đi #%s đã cập nhật trạng thái: %s",
                payload.getTripId(), payload.getTripStatus());

        try {
            if (payload.getCustomerId() != null) {
                notificationService.createTripNotification(new CreateNotificationRequest(
                        "Cập nhật chuyến đi",
                        message,
                        UUID.fromString(payload.getCustomerId())
                ), payload);
            }

            if (payload.getDriverId() != null) {
                notificationService.createTripNotification(new CreateNotificationRequest(
                        "Cập nhật chuyến đi",
                        message,
                        UUID.fromString(payload.getDriverId())
                ), payload);
            }
        } catch (Exception e) {
            log.error("[Notification] Lỗi khi tạo notification cho tripId={}: {}", payload.getTripId(), e.getMessage());
            throw e;
        }

        processedEventRepository.save(ProcessedEvent.builder()
                .eventId(event.getEventId())
                .eventType(event.getEventType())
                .consumerName("TripNotificationListener")
                .build());
    }
}
