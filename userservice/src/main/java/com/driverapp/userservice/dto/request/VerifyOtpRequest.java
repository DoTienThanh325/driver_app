// dto/VerifyOtpRequest.java
package com.driverapp.userservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyOtpRequest(
        @NotBlank String challengeToken,
        @NotBlank
        @Pattern(regexp = "^[0-9]{6}$")
        String otp
) {}