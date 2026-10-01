package com.driverapp.notificationservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateNotificationRequest(
    @NotBlank String title,
    @NotBlank String content,
    @NotNull UUID userId
) {}