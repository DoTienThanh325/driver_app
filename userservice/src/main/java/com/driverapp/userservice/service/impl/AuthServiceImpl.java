package com.driverapp.userservice.service.impl;

import com.driverapp.userservice.dto.LoginRequest;
import com.driverapp.userservice.dto.LoginResponse;
import com.driverapp.userservice.dto.OtpChallengeResult;
import com.driverapp.userservice.dto.RefreshRequest;
import com.driverapp.userservice.dto.RegisterRequest;
import com.driverapp.userservice.dto.TokenResponse;
import com.driverapp.userservice.dto.UserResponse;
import com.driverapp.userservice.dto.VerifyOtpRequest;
import com.driverapp.userservice.models.RefreshToken;
import com.driverapp.userservice.models.Role;
import com.driverapp.userservice.models.RoleCode;
import com.driverapp.userservice.models.User;
import com.driverapp.userservice.models.UserStatus;
import com.driverapp.userservice.repository.RefreshTokenRepository;
import com.driverapp.userservice.repository.RoleRepository;
import com.driverapp.userservice.repository.UserRepository;
import com.driverapp.userservice.service.AuthService;
import com.driverapp.userservice.service.JwtService;
import com.driverapp.userservice.service.OtpChallengeService;
import com.driverapp.userservice.service.SmsSender;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpChallengeService otpChallengeService;
    private final SmsSender smsSender;
    private final JwtService jwtService;

    @Override
    @Transactional
    public void register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())
                || userRepository.existsByPhoneNumber(
                request.phoneNumber()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Username hoặc số điện thoại đã tồn tại"
            );
        }

        Role customerRole = roleRepository
                .findByRoleCode(RoleCode.CUSTOMER)
                .orElseThrow(() -> new IllegalStateException(
                        "Thiếu role CUSTOMER"
                ));

        User user = User.builder()
                .username(request.username())
                .password(
                        passwordEncoder.encode(
                                request.password()
                        )
                )
                .phoneNumber(request.phoneNumber())
                .roles(
                        new HashSet<>(List.of(customerRole))
                )
                .build();

        userRepository.save(user);
    }

    @Override
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        User user = userRepository
                .findByPhoneNumber(request.phoneNumber())
                .orElseThrow(this::invalidCredentials);

        if (!passwordEncoder.matches(
                request.password(),
                user.getPassword()
        )) {
            throw invalidCredentials();
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw invalidCredentials();
        }

        OtpChallengeResult challenge =
                otpChallengeService.create(
                        user.getId()
                );

        smsSender.sendOtp(
                user.getPhoneNumber(),
                challenge.otp()
        );

        return new LoginResponse(
                challenge.challengeToken(),
                challenge.expiresInSeconds(),
                "Đã gửi mã OTP"
        );
    }

    @Override
    @Transactional
    public TokenResponse verifyOtp(
            VerifyOtpRequest request
    ) {
        UUID userId = otpChallengeService.verify(
                request.challengeToken(),
                request.otp()
        );

        User user = userRepository.findById(userId)
                .orElseThrow(this::invalidCredentials);

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw invalidCredentials();
        }

        return jwtService.issueTokens(user);
    }

    @Override
    @Transactional
    public TokenResponse refresh(
            RefreshRequest request
    ) {
        RefreshToken token = refreshTokenRepository
                .findByHashForUpdate(
                        jwtService.sha256(
                                request.refreshToken()
                        )
                )
                .orElseThrow(this::invalidCredentials);

        LocalDateTime now = LocalDateTime.now(
                Clock.systemUTC()
        );

        if (!token.getExpiredAt().isAfter(now)
                || token.getRevokedAt() != null
                || token.getUser().getStatus()
                != UserStatus.ACTIVE) {
            throw invalidCredentials();
        }

        token.setRevokedAt(now);

        return jwtService.issueTokens(
                token.getUser()
        );
    }

    @Override
    @Transactional
    public void logout(RefreshRequest request) {
        refreshTokenRepository.findByHashForUpdate(
                jwtService.sha256(request.refreshToken())
        ).ifPresent(token -> {
            if (token.getRevokedAt() == null) {
                token.setRevokedAt(
                        LocalDateTime.now(Clock.systemUTC())
                );
            }
        });
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse currentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(this::invalidCredentials);

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw invalidCredentials();
        }

        List<String> roles = user.getRoles()
                .stream()
                .map(Role::getRoleCode)
                .map(Enum::name)
                .toList();

        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getPhoneNumber(),
                roles
        );
    }

    private ResponseStatusException invalidCredentials() {
        return new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Thông tin xác thực không hợp lệ"
        );
    }
}