// dto/OtpChallengeResult.java
package com.driverapp.userservice.dto;

public record OtpChallengeResult(
        String challengeToken,
        String otp,
        long expiresInSeconds
) {}