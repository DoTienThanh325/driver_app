// dto/TokenResponse.java
package com.driverapp.userservice.dto;

public record TokenResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresInSeconds
) {}