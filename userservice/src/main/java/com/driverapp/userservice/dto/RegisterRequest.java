// dto/RegisterRequest.java
package com.driverapp.userservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank String username,
        @NotBlank @Size(min = 8) String password,
        @NotBlank
        @Pattern(regexp = "^\\+?[0-9]{9,15}$")
        String phoneNumber
) {}