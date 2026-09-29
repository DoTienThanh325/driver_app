// dto/TokenResponse.java
package com.driverapp.userservice.dto.response;

public record TokenResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresInSeconds
) {}