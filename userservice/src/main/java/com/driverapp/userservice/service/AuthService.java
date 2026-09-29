package com.driverapp.userservice.service;

import com.driverapp.userservice.dto.request.LoginRequest;
import com.driverapp.userservice.dto.request.RefreshRequest;
import com.driverapp.userservice.dto.request.RegisterRequest;
import com.driverapp.userservice.dto.request.VerifyOtpRequest;
import com.driverapp.userservice.dto.response.LoginResponse;
import com.driverapp.userservice.dto.response.TokenResponse;
import com.driverapp.userservice.dto.response.UserResponse;

import java.util.UUID;

public interface AuthService {

    void register(RegisterRequest request);

    LoginResponse login(LoginRequest request);

    TokenResponse verifyOtp(VerifyOtpRequest request);

    TokenResponse refresh(RefreshRequest request);

    void logout(RefreshRequest request);

    UserResponse currentUser(UUID userId);
}