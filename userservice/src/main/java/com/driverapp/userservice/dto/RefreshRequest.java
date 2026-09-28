// dto/RefreshRequest.java
package com.driverapp.userservice.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(
        @NotBlank String refreshToken
) {}