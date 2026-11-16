package com.driverapp.userservice.controller;

import com.driverapp.userservice.dto.response.OtpChallengeResult;
import com.driverapp.userservice.models.User;
import com.driverapp.userservice.publisher.SmsEventPublisher;
import com.driverapp.userservice.repository.UserRepository;
import com.driverapp.userservice.service.OtpChallengeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping({"/api/auth", "/api/v1/auth"})
@RequiredArgsConstructor
public class OtpResendController {

    private final OtpChallengeService otpChallengeService;
    private final com.driverapp.userservice.config.RateLimitProperties rateLimitProperties;
    private final UserRepository userRepository;
    private final SmsEventPublisher smsEventPublisher;

    @PostMapping("/resend-otp")
    public ResponseEntity<Map<String, Object>> resendOtp(@RequestBody Map<String, String> request) {
        String phoneNumber = request.get("phoneNumber");
        String challengeToken = request.get("challengeToken");

        User user = null;
        if (phoneNumber != null && !phoneNumber.isBlank()) {
            user = userRepository.findByPhoneNumber(phoneNumber)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng với số điện thoại này"));
        } else if (challengeToken != null && !challengeToken.isBlank()) {
            UUID userId = otpChallengeService.validatedUserId(challengeToken);
            user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần cung cấp phoneNumber hoặc challengeToken để gửi lại OTP");
        }

        OtpChallengeResult challenge = otpChallengeService.create(user.getId());
        smsEventPublisher.publishSendOtp(user.getPhoneNumber(), challenge.otp());

        Map<String, Object> response = new java.util.HashMap<>();
        response.put("challengeToken", challenge.challengeToken());
        response.put("expiresInSeconds", challenge.expiresInSeconds());
        response.put("message", "Mã OTP mới đã được gửi lại vào số điện thoại của bạn.");
        if (rateLimitProperties.isExposeOtp()) response.put("otp", challenge.otp());
        return ResponseEntity.ok(response);
    }
}
