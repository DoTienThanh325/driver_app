package com.driverapp.notificationservice.service;

import com.driverapp.notificationservice.dto.request.NotificationRequest;
import com.driverapp.notificationservice.models.Notification;

public interface NotificationService {
    Notification sendNotification(NotificationRequest request);
}
