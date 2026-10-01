package com.driverapp.userservice.dto.response;

import lombok.Builder;

@Builder
public record LoginResponse(
        String challengeToken,
        long expiresInSeconds,
        String message
) {}
