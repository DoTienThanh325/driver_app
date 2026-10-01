package com.driverapp.userservice.dto.request;

import jakarta.validation.constraints.NotBlank;

public record VerifyOtpRequest(
        @NotBlank String otp,
        @NotBlank String challengeToken
) {}
