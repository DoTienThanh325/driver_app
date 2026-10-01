package com.driverapp.notificationservice.service;

import com.driverapp.notificationservice.dto.request.CreateNotificationRequest;

public interface NotificationService {
    void createNotification(CreateNotificationRequest request);
}