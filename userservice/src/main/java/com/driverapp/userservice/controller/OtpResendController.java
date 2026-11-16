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
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class OtpResendController {

    private final OtpChallengeService otpChallengeService;
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
            // Trường hợp có challengeToken, có thể trích xuất userId từ payload
            try {
                String[] parts = challengeToken.split("\\.", -1);
                String decodedPayload = new String(java.util.Base64.getUrlDecoder().decode(parts[0]), java.nio.charset.StandardCharsets.UTF_8);
                UUID userId = UUID.fromString(decodedPayload.split(":", -1)[0]);
                user = userRepository.findById(userId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "challengeToken không hợp lệ: " + e.getMessage());
            }
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần cung cấp phoneNumber hoặc challengeToken để gửi lại OTP");
        }

        OtpChallengeResult challenge = otpChallengeService.create(user.getId());
        smsEventPublisher.publishSendOtp(user.getPhoneNumber(), challenge.otp());

        log.info("======================================================================");
        log.info(">> [AUTH] OTP RESEND GENERATED <<");
        log.info(">> Phone Number : {}", user.getPhoneNumber());
        log.info(">> OTP Code     : {}", challenge.otp());
        log.info(">> Expires In   : {} seconds", challenge.expiresInSeconds());
        log.info("======================================================================");

        return ResponseEntity.ok(Map.of(
                "challengeToken", challenge.challengeToken(),
                "expiresInSeconds", challenge.expiresInSeconds(),
                "message", "Mã OTP mới đã được gửi lại vào số điện thoại của bạn.",
                "otp", challenge.otp()
        ));
    }
}
