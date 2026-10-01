package com.driverapp.bookingservice.dto.request;

import java.util.UUID;

public record CreateNotificationRequest(
    String title,
    String content,
    UUID userId
) {}