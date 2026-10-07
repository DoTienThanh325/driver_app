package com.driverapp.userservice.controller;

import com.driverapp.userservice.dto.request.GrantRoleRequest;
import com.driverapp.userservice.dto.response.UserInfoResponse;
import com.driverapp.userservice.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * POST /api/users/{userId}/roles
     * Cấp role cho user (tổng quát, idempotent).
     * Được gọi bởi các service khác (bookingservice, driverservice, ...).
     *
     * Body: { "roleCode": "BUSINESS" }
     */
    @PostMapping("/{userId}/roles")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void grantRole(
            @PathVariable UUID userId,
            @Valid @RequestBody GrantRoleRequest request) {
        userService.grantRole(userId, request.roleCode());
    }

    /**
     * DELETE /api/users/{userId}/roles/{roleCode}
     * Thu hồi role của user (tổng quát, idempotent).
     * Được gọi bởi các service khác (bookingservice, ...).
     */
    @DeleteMapping("/{userId}/roles/{roleCode}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeRole(
            @PathVariable UUID userId,
            @PathVariable String roleCode) {
        userService.revokeRole(userId, roleCode);
    }

    /**
     * GET /api/users/{userId}
     * Lấy thông tin cơ bản của user (dành cho các service nội bộ như driverservice gọi).
     */
    @GetMapping("/{userId}")
    public UserInfoResponse getUserInfo(@PathVariable UUID userId) {
        return userService.getUserInfo(userId);
    }
}
