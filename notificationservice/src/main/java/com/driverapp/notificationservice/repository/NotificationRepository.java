package com.driverapp.notificationservice.repository;

import com.driverapp.notificationservice.models.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
}
