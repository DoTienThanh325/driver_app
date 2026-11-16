package com.driverapp.userservice.service;

import java.util.UUID;

import com.driverapp.userservice.dto.response.OtpChallengeResult;

public interface OtpChallengeService {

    OtpChallengeResult create(UUID userId);

    UUID validatedUserId(String challengeToken);

    UUID verify(String challengeToken, String otp);
}