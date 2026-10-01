package com.driverapp.userservice.service;

import java.util.UUID;

public interface UserService {
    void assignRole(UUID userId, String roleCode);
}
