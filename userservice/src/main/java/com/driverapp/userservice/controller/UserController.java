package com.driverapp.userservice.controller;

import com.driverapp.userservice.dto.request.GrantRoleRequest;
import com.driverapp.userservice.models.Role;
import com.driverapp.userservice.models.RoleCode;
import com.driverapp.userservice.models.User;
import com.driverapp.userservice.repository.RoleRepository;
import com.driverapp.userservice.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    /**
     * POST /api/users/{userId}/roles
     * Cấp role cho user (tổng quát, idempotent).
     * Được gọi bởi các service khác (bookingservice, driverservice, ...).
     *
     * Body: { "roleCode": "BUSINESS" }
     */
    @PostMapping("/{userId}/roles")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void grantRole(
            @PathVariable UUID userId,
            @Valid @RequestBody GrantRoleRequest request) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy user với id: " + userId));

        RoleCode roleCode;
        try {
            roleCode = RoleCode.valueOf(request.roleCode().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "RoleCode không hợp lệ: " + request.roleCode());
        }

        Role role = roleRepository.findByRoleCode(roleCode)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Role chưa được khởi tạo trong DB: " + roleCode));

        // Idempotent: không thêm nếu đã có
        boolean alreadyHas = user.getRoles().stream()
                .anyMatch(r -> r.getRoleCode() == roleCode);

        if (!alreadyHas) {
            user.getRoles().add(role);
            userRepository.save(user);
        }
    }
}
