package com.driverapp.userservice.dto.request;

import jakarta.validation.constraints.NotBlank;

public record BanUserRequest(
        @NotBlank(message = "Lý do khoá tài khoản không được để trống")
        String reason
) {}
