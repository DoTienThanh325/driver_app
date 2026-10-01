package com.driverapp.notificationservice.service.impl;

import com.driverapp.notificationservice.dto.request.NotificationRequest;
import com.driverapp.notificationservice.models.Notification;
import com.driverapp.notificationservice.repository.NotificationRepository;
import com.driverapp.notificationservice.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

    @Override
    @Transactional
    public Notification sendNotification(NotificationRequest request) {
        Notification notification = Notification.builder()
                .userId(request.userId())
                .title(request.title())
                .content(request.content())
                .build();

        Notification saved = notificationRepository.save(notification);
        log.info("Tạo thông báo mới thành công cho userId: {}, id: {}", request.userId(), saved.getId());
        return saved;
    }
}
