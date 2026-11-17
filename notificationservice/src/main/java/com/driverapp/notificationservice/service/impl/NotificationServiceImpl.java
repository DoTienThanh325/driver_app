package com.driverapp.notificationservice.service.impl;

import com.driverapp.notificationservice.dto.request.CreateNotificationRequest;
import com.driverapp.notificationservice.dto.websocket.NotificationMessage;
import com.driverapp.notificationservice.models.Notification;
import com.driverapp.notificationservice.repository.NotificationRepository;
import com.driverapp.notificationservice.service.NotificationService;
import com.driverapp.notificationservice.websocket.WebSocketNotificationPusher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final WebSocketNotificationPusher notificationPusher;

    @Override
    public Notification createNotification(CreateNotificationRequest request) {
        Notification saved = save(request);

        // Best-effort push realtime via WebSocket (lỗi push không làm throw transaction)
        try {
            notificationPusher.pushToUser(request.userId(), NotificationMessage.general(saved));
        } catch (Exception ex) {
            log.warn("[Notification] Could not push websocket notification for user {}: {}",
                    request.userId(), ex.getMessage());
        }

        return saved;
    }

    @Override
    public Notification createTripNotification(CreateNotificationRequest request, com.driverapp.notificationservice.event.TripEventPayload payload) {
        Notification saved = save(request);

        try {
            notificationPusher.pushToUser(request.userId(), NotificationMessage.trip(saved, payload));
        } catch (Exception ex) {
            log.warn("[Notification] Could not push websocket trip notification for user {}: {}",
                    request.userId(), ex.getMessage());
        }

        return saved;
    }

    private Notification save(CreateNotificationRequest request) {
        Notification notification = Notification.builder()
                .title(request.title())
                .content(request.content())
                .userId(request.userId())
                .build();
        return notificationRepository.save(notification);
    }
}