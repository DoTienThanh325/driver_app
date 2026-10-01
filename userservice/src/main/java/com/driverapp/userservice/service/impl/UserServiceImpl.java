package com.driverapp.userservice.service.impl;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.driverapp.userservice.models.Role;
import com.driverapp.userservice.models.enums.RoleCode;
import com.driverapp.userservice.models.User;
import com.driverapp.userservice.repository.RoleRepository;
import com.driverapp.userservice.repository.UserRepository;
import com.driverapp.userservice.service.UserService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Override
    @Transactional
    public void assignRole(UUID userId, String roleCodeStr) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        RoleCode roleCode;
        try {
            roleCode = RoleCode.valueOf(roleCodeStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role code: " + roleCodeStr);
        }

        Role role = roleRepository.findByRoleCode(roleCode)
                .orElseThrow(() -> new IllegalArgumentException("Role not found with code: " + roleCodeStr));

        user.getRoles().add(role);
        userRepository.save(user);
    }
}
