package com.driverapp.userservice.dto.response;

import lombok.Builder;

import java.util.List;
import java.util.UUID;

@Builder
public record UserResponse(
        UUID id,
        String username,
        String phoneNumber,
        List<String> roles
) {}
