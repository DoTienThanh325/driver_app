// dto/OtpChallengeResult.java
package com.driverapp.userservice.dto.response;

public record OtpChallengeResult(
        String challengeToken,
        String otp,
        long expiresInSeconds
) {}