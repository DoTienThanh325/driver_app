package com.driverapp.driverservice.service;

import com.driverapp.driverservice.dto.response.DriverApprovalResponse;

import java.util.UUID;

public interface DriverApprovalService {
    DriverApprovalResponse approveDriver(UUID driverId);
}
