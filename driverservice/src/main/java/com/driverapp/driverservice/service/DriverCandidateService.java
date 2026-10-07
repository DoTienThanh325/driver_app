package com.driverapp.driverservice.service;

import com.driverapp.driverservice.dto.response.DriverCandidateResponse;
import com.driverapp.driverservice.dto.response.DriverDetailResponse;

import java.util.List;
import java.util.UUID;

public interface DriverCandidateService {
    List<DriverCandidateResponse> getPendingCandidates();

    DriverDetailResponse getDriverDetail(UUID driverId, UUID currentUserId, List<String> roles);
}
