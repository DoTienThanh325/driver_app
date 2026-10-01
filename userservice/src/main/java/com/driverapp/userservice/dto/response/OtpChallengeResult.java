package com.driverapp.userservice.dto.response;

import lombok.Builder;

@Builder
public record OtpChallengeResult(
        String challengeToken,
        String otp,
        long expiresInSeconds
) {}
