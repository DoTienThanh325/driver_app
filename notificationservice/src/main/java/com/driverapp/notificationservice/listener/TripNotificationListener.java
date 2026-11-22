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
        String message = customerMessage(payload);
        if (message != null && payload.getCustomerId() != null) {
            notificationService.createTripNotification(new CreateNotificationRequest(
                    "Cập nhật chuyến đi",
                    message,
                    UUID.fromString(payload.getCustomerId())
            ), payload);
        }

        processedEventRepository.save(ProcessedEvent.builder()
                .eventId(event.getEventId())
                .eventType(event.getEventType())
                .consumerName("TripNotificationListener")
                .build());
    }

    private String customerMessage(TripEventPayload payload) {
        if (payload == null || payload.getTripStatus() == null) {
            return null;
        }

        boolean delivery = "FOOD_DELIVERY".equals(payload.getShippingType());
        String update = switch (payload.getTripStatus()) {
            case "DRIVER_ASSIGNED" -> delivery ? "tài xế đã nhận đơn giao món." : "tài xế đã nhận chuyến.";
            case "DRIVER_ARRIVING" -> delivery ? "tài xế đã đến quán." : "tài xế đã đến điểm đón.";
            case "IN_PROGRESS" -> delivery ? "tài xế đang giao món." : "chuyến đi đã bắt đầu.";
            case "COMPLETED" -> delivery ? "đơn món đã được giao." : "chuyến đi đã hoàn thành.";
            case "CANCELLED" -> delivery ? "đơn giao món đã bị hủy." : "chuyến đi đã bị hủy.";
            default -> null;
        };
        if (update == null) {
            return null;
        }

        String pickup = payload.getPickupAddress();
        String dropoff = payload.getDropoffAddress();
        String subject = delivery ? "Đơn giao món" : "Chuyến đi";
        return pickup != null && !pickup.isBlank() && dropoff != null && !dropoff.isBlank()
                ? "%s từ %s tới %s: %s".formatted(subject, pickup.strip(), dropoff.strip(), update)
                : "%s của bạn: %s".formatted(subject, update);
    }

}
