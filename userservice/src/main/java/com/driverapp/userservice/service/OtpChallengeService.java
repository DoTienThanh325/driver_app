package com.driverapp.userservice.service;

import com.driverapp.userservice.dto.response.OtpChallengeResult;

import java.util.UUID;

public interface OtpChallengeService {

    OtpChallengeResult create(UUID userId);

    UUID verify(String challengeToken, String otp);
}