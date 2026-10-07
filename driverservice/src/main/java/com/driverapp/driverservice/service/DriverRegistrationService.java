package com.driverapp.driverservice.service;

import java.util.*;

import com.driverapp.driverservice.dto.request.RegisterDriverRequest;
import com.driverapp.driverservice.dto.request.UpdateDriverRegistrationRequest;
import com.driverapp.driverservice.dto.response.RegisterDriverResponse;

public interface DriverRegistrationService {
    RegisterDriverResponse register(UUID userId, String username, RegisterDriverRequest request);

    void updateRegistration(UUID userId, String username, UpdateDriverRegistrationRequest request);
}
