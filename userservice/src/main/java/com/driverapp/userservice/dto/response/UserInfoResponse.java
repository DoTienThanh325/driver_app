package com.driverapp.userservice.dto.response;

import java.util.UUID;

public record UserInfoResponse(
        UUID userId,
        String username,
        String phoneNumber
) {}
