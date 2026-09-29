// dto/LoginRequest.java
package com.driverapp.userservice.dto.request;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank String phoneNumber,
        @NotBlank String password
) {}