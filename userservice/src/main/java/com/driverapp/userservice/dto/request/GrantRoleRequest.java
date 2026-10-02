package com.driverapp.userservice.dto.request;

import jakarta.validation.constraints.NotBlank;

public record GrantRoleRequest(
        @NotBlank(message = "roleCode không được để trống")
        String roleCode
) {}
