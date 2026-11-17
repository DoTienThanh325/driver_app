package com.driverapp.notificationservice.service;

import com.driverapp.notificationservice.dto.request.CreateNotificationRequest;
import com.driverapp.notificationservice.event.TripEventPayload;
import com.driverapp.notificationservice.models.Notification;

public interface NotificationService {
    Notification createNotification(CreateNotificationRequest request);
    Notification createTripNotification(CreateNotificationRequest request, TripEventPayload payload);
}