package com.driverapp.notificationservice.service.impl;

import com.driverapp.notificationservice.dto.request.CreateNotificationRequest;
import com.driverapp.notificationservice.models.Notification;
import com.driverapp.notificationservice.repository.NotificationRepository;
import com.driverapp.notificationservice.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

    @Override
    public void createNotification(CreateNotificationRequest request) {
        Notification notification = Notification.builder()
                .title(request.title())
                .content(request.content())
                .userId(request.userId())
                .build();
        notificationRepository.save(notification);
    }
}