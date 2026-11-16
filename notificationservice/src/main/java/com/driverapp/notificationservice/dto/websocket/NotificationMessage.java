package com.driverapp.notificationservice.dto.websocket;

import com.driverapp.notificationservice.event.TripEventPayload;
import com.driverapp.notificationservice.models.Notification;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;

public record NotificationMessage(
        String id,
        String type,
        String title,
        String content,
        Map<String, Object> data,
        Instant timestamp
) {
    public static NotificationMessage general(Notification notification) {
        return new NotificationMessage(
                notification.getId() != null ? notification.getId().toString() : null,
                "GENERAL",
                notification.getTitle(),
                notification.getContent(),
                Map.of(),
                Instant.now()
        );
    }

    public static NotificationMessage trip(Notification notification, TripEventPayload payload) {
        String tripStatus = payload != null && payload.getTripStatus() != null ? payload.getTripStatus() : "UPDATED";
        Map<String, Object> meta = payload != null ? Map.of(
                "tripId", Objects.requireNonNullElse(payload.getTripId(), ""),
                "tripStatus", Objects.requireNonNullElse(payload.getTripStatus(), ""),
                "pickupAddress", Objects.requireNonNullElse(payload.getPickupAddress(), ""),
                "dropoffAddress", Objects.requireNonNullElse(payload.getDropoffAddress(), "")
        ) : Map.of();

        return new NotificationMessage(
                notification.getId() != null ? notification.getId().toString() : null,
                "TRIP_" + tripStatus,
                notification.getTitle(),
                notification.getContent(),
                meta,
                Instant.now()
        );
    }
}
