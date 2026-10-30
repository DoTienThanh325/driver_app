// dto/LoginResponse.java
package com.driverapp.userservice.dto.response;

public record LoginResponse(
        String challengeToken,
        long expiresInSeconds,
        String message,
        String otp
) {
    public LoginResponse(String challengeToken, long expiresInSeconds, String message) {
        this(challengeToken, expiresInSeconds, message, null);
    }
}