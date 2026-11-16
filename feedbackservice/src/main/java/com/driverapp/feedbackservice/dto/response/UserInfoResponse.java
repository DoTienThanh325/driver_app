package com.driverapp.feedbackservice.dto.response;

import java.util.UUID;

public record UserInfoResponse(
        UUID userId,
        String username,
        String phoneNumber
) {}
