package com.driverapp.userservice.service.impl;

import com.driverapp.userservice.config.OtpProperties;
import com.driverapp.userservice.dto.response.OtpChallengeResult;
import com.driverapp.userservice.service.OtpChallengeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OtpChallengeServiceImpl
        implements OtpChallengeService {

    private final OtpProperties otpProperties;
    private final com.driverapp.userservice.service.AuthRateLimitService rateLimits;

    private final SecureRandom random = new SecureRandom();

    @Override
    public OtpChallengeResult create(UUID userId) {
        rateLimits.check("otp-cooldown", userId.toString());
        rateLimits.check("otp-hour", userId.toString());
        String otp = "%06d".formatted(
                random.nextInt(1_000_000)
        );

        UUID nonce = UUID.randomUUID();

        long expiresAt = Instant.now()
                .plusSeconds(
                        otpProperties.getExpiresMinutes() * 60L
                )
                .getEpochSecond();

        String proof = encode(
                hmac(userId + ":" + nonce + ":" + otp)
        );

        String payload = userId
                + ":" + expiresAt
                + ":" + nonce
                + ":" + proof;

        String encodedPayload = encode(
                payload.getBytes(StandardCharsets.UTF_8)
        );

        String signature = encode(
                hmac(encodedPayload)
        );

        return new OtpChallengeResult(
                encodedPayload + "." + signature,
                otp,
                otpProperties.getExpiresMinutes() * 60L
        );
    }

    @Override
    public UUID validatedUserId(String challengeToken) {
        return UUID.fromString(verifiedFields(challengeToken)[0]);
    }

    @Override
    public UUID verify(String challengeToken, String otp) {
        String[] fields = verifiedFields(challengeToken);
        UUID userId = UUID.fromString(fields[0]);
        int remaining = (int)Math.max(1, Long.parseLong(fields[1]) - Instant.now().getEpochSecond());
        rateLimits.check("verify", userId.toString());
        rateLimits.checkChallenge(challengeToken, remaining);
        if (otp == null || !MessageDigest.isEqual(hmac(userId + ":" + fields[2] + ":" + otp), decode(fields[3]))) {
            throw invalidOtp();
        }
        rateLimits.consumeChallenge(challengeToken, remaining);
        return userId;
    }

    private String[] verifiedFields(String challengeToken) {
        try {
            if (challengeToken == null || challengeToken.length() > 4096) throw invalidOtp();
            String[] parts = challengeToken.split("\\.", -1);
            if (parts.length != 2 || !MessageDigest.isEqual(hmac(parts[0]), decode(parts[1]))) throw invalidOtp();
            String[] fields = new String(decode(parts[0]), StandardCharsets.UTF_8).split(":", -1);
            if (fields.length != 4) throw invalidOtp();
            UUID.fromString(fields[0]);
            UUID.fromString(fields[2]);
            if (Instant.now().getEpochSecond() >= Long.parseLong(fields[1])) throw invalidOtp();
            decode(fields[3]);
            return fields;
        } catch (IllegalArgumentException invalid) {
            throw invalidOtp();
        }
    }

    private byte[] hmac(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");

            mac.init(
                    new SecretKeySpec(
                            otpProperties.getChallengeSecret()
                                    .getBytes(StandardCharsets.UTF_8),
                            "HmacSHA256"
                    )
            );

            return mac.doFinal(
                    value.getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Không tạo được OTP challenge",
                    exception
            );
        }
    }

    private String encode(byte[] bytes) {
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(bytes);
    }

    private byte[] decode(String value) {
        return Base64.getUrlDecoder().decode(value);
    }

    private ResponseStatusException invalidOtp() {
        return new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "OTP hoặc challenge không hợp lệ"
        );
    }
}