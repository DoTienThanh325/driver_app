package com.driverapp.userservice.controller;

import com.driverapp.userservice.dto.request.LoginRequest;
import com.driverapp.userservice.dto.request.RefreshRequest;
import com.driverapp.userservice.dto.request.RegisterRequest;
import com.driverapp.userservice.dto.request.VerifyOtpRequest;
import com.driverapp.userservice.dto.response.LoginResponse;
import com.driverapp.userservice.dto.response.TokenResponse;
import com.driverapp.userservice.dto.response.UserResponse;
import com.driverapp.userservice.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return Map.of("message", "Đăng ký thành công");
    }

    @PostMapping("/auth/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/auth/verify-otp")
    public TokenResponse verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        return authService.verifyOtp(request);
    }

    @PostMapping("/auth/refresh")
    public TokenResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request);
    }

    @PostMapping("/auth/logout")
    public Map<String, String> logout(@Valid @RequestBody RefreshRequest request) {
        authService.logout(request);
        return Map.of("message", "Đăng xuất thành công");
    }

    @GetMapping("/users/me")
    public UserResponse me(JwtAuthenticationToken authentication) {
        UUID userId = UUID.fromString(
                authentication.getToken().getSubject()
        );

        return authService.currentUser(userId);
    }
}