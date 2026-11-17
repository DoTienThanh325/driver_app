package com.driverapp.userservice.controller;

import com.driverapp.userservice.dto.request.BanUserRequest;
import com.driverapp.userservice.dto.response.AdminUserStatusResponse;
import com.driverapp.userservice.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;

    @PatchMapping("/{userId}/ban")
    public AdminUserStatusResponse banUser(
            @PathVariable UUID userId,
            @Valid @RequestBody BanUserRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID adminUserId = UUID.fromString(jwt.getSubject());
        return userService.banUser(userId, adminUserId, request.reason());
    }

    @PatchMapping("/{userId}/unban")
    public AdminUserStatusResponse unbanUser(@PathVariable UUID userId) {
        return userService.unbanUser(userId);
    }
}
