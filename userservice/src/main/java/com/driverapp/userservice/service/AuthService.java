package com.driverapp.userservice.service;

import com.driverapp.userservice.dto.LoginRequest;
import com.driverapp.userservice.dto.LoginResponse;
import com.driverapp.userservice.dto.RefreshRequest;
import com.driverapp.userservice.dto.RegisterRequest;
import com.driverapp.userservice.dto.TokenResponse;
import com.driverapp.userservice.dto.UserResponse;
import com.driverapp.userservice.dto.VerifyOtpRequest;

import java.util.UUID;

public interface AuthService {

    void register(RegisterRequest request);

    LoginResponse login(LoginRequest request);

    TokenResponse verifyOtp(VerifyOtpRequest request);

    TokenResponse refresh(RefreshRequest request);

    void logout(RefreshRequest request);

    UserResponse currentUser(UUID userId);
}