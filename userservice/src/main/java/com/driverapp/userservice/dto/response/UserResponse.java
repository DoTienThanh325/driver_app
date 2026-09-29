// dto/UserResponse.java
package com.driverapp.userservice.dto.response;

import java.util.List;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String username,
        String phoneNumber,
        List<String> roles
) {}