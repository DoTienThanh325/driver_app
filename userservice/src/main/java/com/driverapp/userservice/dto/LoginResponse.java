// dto/LoginResponse.java
package com.driverapp.userservice.dto;

public record LoginResponse(
        String challengeToken,
        long expiresInSeconds,
        String message
) {}