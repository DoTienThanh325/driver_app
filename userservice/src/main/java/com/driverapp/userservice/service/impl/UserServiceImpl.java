package com.driverapp.userservice.service.impl;

import com.driverapp.userservice.dto.response.AdminUserStatusResponse;
import com.driverapp.userservice.dto.response.UserInfoResponse;
import com.driverapp.userservice.models.Role;
import com.driverapp.userservice.models.RoleCode;
import com.driverapp.userservice.models.User;
import com.driverapp.userservice.models.UserStatus;
import com.driverapp.userservice.repository.RefreshTokenRepository;
import com.driverapp.userservice.repository.RoleRepository;
import com.driverapp.userservice.repository.UserRepository;
import com.driverapp.userservice.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    @Override
    @Transactional
    public void grantRole(UUID userId, String rawRoleCode) {
        User user = findUserOrThrow(userId);
        RoleCode roleCode = parseRoleCodeOrThrow(rawRoleCode);

        Role role = roleRepository.findByRoleCode(roleCode)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Role chưa được khởi tạo trong DB: " + roleCode));

        boolean alreadyHas = user.getRoles().stream()
                .anyMatch(r -> r.getRoleCode() == roleCode);

        if (!alreadyHas) {
            user.getRoles().add(role);
            userRepository.save(user);
            log.info("Đã cấp role {} cho userId={}", roleCode, userId);
        }
    }

    @Override
    @Transactional
    public void revokeRole(UUID userId, String rawRoleCode) {
        User user = findUserOrThrow(userId);
        RoleCode roleCode = parseRoleCodeOrThrow(rawRoleCode);

        boolean removed = user.getRoles().removeIf(r -> r.getRoleCode() == roleCode);
        if (removed) {
            userRepository.save(user);
            log.info("Đã thu hồi role {} của userId={}", roleCode, userId);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public UserInfoResponse getUserInfo(UUID userId) {
        User user = findUserOrThrow(userId);
        return new UserInfoResponse(
                user.getId(),
                user.getUsername(),
                user.getPhoneNumber()
        );
    }

    @Override
    @Transactional
    public AdminUserStatusResponse banUser(UUID targetUserId, UUID adminUserId, String reason) {
        if (targetUserId.equals(adminUserId)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Không thể tự khoá tài khoản của chính mình");
        }

        User target = findUserOrThrow(targetUserId);

        boolean isAdmin = target.getRoles().stream()
                .anyMatch(r -> r.getRoleCode() == RoleCode.ADMIN);
        if (isAdmin) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Không thể khoá tài khoản có quyền ADMIN");
        }

        if (target.getStatus() != UserStatus.BANNED) {
            target.ban(reason.trim());
            userRepository.save(target);
        }

        int revoked = refreshTokenRepository.revokeAllActiveByUserId(targetUserId, LocalDateTime.now());
        log.info("Admin {} đã khoá userId={}, thu hồi {} refresh token", adminUserId, targetUserId, revoked);

        return new AdminUserStatusResponse(
                target.getId(),
                target.getStatus(),
                target.getBanReason(),
                target.getBannedAt()
        );
    }

    @Override
    @Transactional
    public AdminUserStatusResponse unbanUser(UUID targetUserId) {
        User target = findUserOrThrow(targetUserId);
        if (target.getStatus() == UserStatus.BANNED) {
            target.unban();
            userRepository.save(target);
            log.info("Đã mở khoá tài khoản userId={}", targetUserId);
        }

        return new AdminUserStatusResponse(
                target.getId(),
                target.getStatus(),
                target.getBanReason(),
                target.getBannedAt()
        );
    }

    private User findUserOrThrow(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy user với id: " + userId));
    }

    private RoleCode parseRoleCodeOrThrow(String rawRoleCode) {
        try {
            return RoleCode.valueOf(rawRoleCode.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "RoleCode không hợp lệ: " + rawRoleCode);
        }
    }
}
