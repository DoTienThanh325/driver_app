package com.driverapp.userservice.service.impl;

import com.driverapp.userservice.config.JwtProperties;
import com.driverapp.userservice.dto.response.TokenResponse;
import com.driverapp.userservice.models.RefreshToken;
import com.driverapp.userservice.models.Role;
import com.driverapp.userservice.models.User;
import com.driverapp.userservice.repository.RefreshTokenRepository;
import com.driverapp.userservice.service.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JwtServiceImpl implements JwtService {

    private final JwtEncoder jwtEncoder;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtProperties jwtProperties;

    private final SecureRandom random = new SecureRandom();

    @Override
    public TokenResponse issueTokens(User user) {
        Instant issuedAt = Instant.now();

        List<String> roles = user.getRoles()
                .stream()
                .map(Role::getRoleCode)
                .map(Enum::name)
                .toList();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(jwtProperties.getIssuer())
                .subject(user.getId().toString())
                .issuedAt(issuedAt)
                .expiresAt(
                        issuedAt.plusSeconds(
                                jwtProperties.getAccessMinutes() * 60L
                        )
                )
                .claim("roles", roles)
                .claim("username", user.getUsername())
                .build();

        String accessToken = jwtEncoder.encode(
                JwtEncoderParameters.from(claims)
        ).getTokenValue();

        byte[] randomBytes = new byte[32];
        random.nextBytes(randomBytes);

        String rawRefreshToken = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(randomBytes);

        RefreshToken storedToken = RefreshToken.builder()
                .user(user)
                .refreshToken(sha256(rawRefreshToken))
                .expiredAt(
                        LocalDateTime.now(Clock.systemUTC())
                                .plusDays(
                                        jwtProperties.getRefreshDays()
                                )
                )
                .build();

        refreshTokenRepository.save(storedToken);

        return new TokenResponse(
                accessToken,
                rawRefreshToken,
                "Bearer",
                jwtProperties.getAccessMinutes() * 60L
        );
    }

    @Override
    public String sha256(String value) {
        try {
            byte[] hash = MessageDigest
                    .getInstance("SHA-256")
                    .digest(
                            value.getBytes(StandardCharsets.UTF_8)
                    );

            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}