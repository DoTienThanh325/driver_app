package com.driverapp.userservice.service;

import com.driverapp.userservice.dto.response.UserInfoResponse;

import java.util.UUID;

public interface UserService {
    void grantRole(UUID userId, String roleCode);
    void revokeRole(UUID userId, String roleCode);
    UserInfoResponse getUserInfo(UUID userId);
}
