package com.driverapp.userservice.service;

import com.driverapp.userservice.dto.OtpChallengeResult;

import java.util.UUID;

public interface OtpChallengeService {

    OtpChallengeResult create(UUID userId);

    UUID verify(String challengeToken, String otp);
}