// dto/RefreshRequest.java
package com.driverapp.userservice.dto.request;

import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(
        @NotBlank String refreshToken
) {}