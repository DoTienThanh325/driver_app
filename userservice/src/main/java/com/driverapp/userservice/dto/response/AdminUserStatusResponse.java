package com.driverapp.userservice.dto.response;

import com.driverapp.userservice.models.UserStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record AdminUserStatusResponse(
        UUID userId,
        UserStatus status,
        String banReason,
        LocalDateTime bannedAt
) {}
