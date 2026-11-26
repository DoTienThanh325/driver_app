package com.driverapp.notificationservice.listener;

import com.driverapp.notificationservice.dto.websocket.NotificationMessage;
import com.driverapp.notificationservice.event.DomainEvent;
import com.driverapp.notificationservice.event.DriverOfferEventPayload;
import com.driverapp.notificationservice.websocket.WebSocketNotificationPusher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Component
@RequiredArgsConstructor
public class DriverOfferNotificationListener {

    private final WebSocketNotificationPusher notificationPusher;

    @RabbitListener(containerFactory = "resilienceRabbitListenerContainerFactory", queues = "trip.driver-offer.queue")
    public void handleDriverOfferUpdated(DomainEvent<DriverOfferEventPayload> event) {
        DriverOfferEventPayload payload = event != null ? event.getPayload() : null;
        if (payload == null || payload.getDriverId() == null || payload.getOfferId() == null) {
            return;
        }

        NotificationMessage wsMsg = new NotificationMessage(
                "offer-" + payload.getOfferId() + "-" + Objects.requireNonNullElse(payload.getStatus(), "UPDATED"),
                "DRIVER_OFFER_UPDATED",
                "Cập nhật lời mời chuyến đi",
                "Trạng thái lời mời: " + Objects.requireNonNullElse(payload.getStatus(), "UPDATED"),
                Map.of(
                        "offerId", payload.getOfferId(),
                        "tripId", Objects.requireNonNullElse(payload.getTripId(), ""),
                        "status", Objects.requireNonNullElse(payload.getStatus(), ""),
                        "backToBack", payload.isBackToBack()
                ),
                Instant.now()
        );

        boolean pushed = notificationPusher.pushToUser(payload.getDriverId(), wsMsg);
        log.debug("[WS DriverOffer] driverId={}, offerId={}, status={}, pushed={}",
                payload.getDriverId(), payload.getOfferId(), payload.getStatus(), pushed);
    }
}
