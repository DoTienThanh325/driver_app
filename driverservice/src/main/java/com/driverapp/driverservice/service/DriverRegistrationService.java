package com.driverapp.driverservice.service;

import java.util.*;

import com.driverapp.driverservice.dto.request.RegisterDriverRequest;
import com.driverapp.driverservice.dto.response.RegisterDriverResponse;

public interface DriverRegistrationService {
    RegisterDriverResponse register(UUID userId, RegisterDriverRequest request);
}
