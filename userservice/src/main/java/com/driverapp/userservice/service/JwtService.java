package com.driverapp.userservice.service;

import com.driverapp.userservice.dto.response.TokenResponse;
import com.driverapp.userservice.models.User;

public interface JwtService {

    TokenResponse issueTokens(User user);

    String sha256(String value);
}