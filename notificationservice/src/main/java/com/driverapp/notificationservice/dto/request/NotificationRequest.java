package com.driverapp.notificationservice.dto.request;

import java.util.UUID;
import lombok.Builder;

@Builder
public record NotificationRequest(
        UUID userId,
        String title,
        String content
) {}
