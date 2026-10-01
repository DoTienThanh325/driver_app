package com.driverapp.notificationservice.controller;

import com.driverapp.notificationservice.dto.request.CreateNotificationRequest;
import com.driverapp.notificationservice.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> createNotification(
            @Valid @RequestBody CreateNotificationRequest request) {
        notificationService.createNotification(request);
        return Map.of("message", "Tạo thông báo thành công");
    }
}