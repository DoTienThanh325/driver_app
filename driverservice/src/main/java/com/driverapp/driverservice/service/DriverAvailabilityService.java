package com.driverapp.driverservice.service;

import com.driverapp.driverservice.dto.request.UpdateAvailabilityRequest;
import com.driverapp.driverservice.dto.response.DriverProfileResponse;
import java.util.UUID;

public interface DriverAvailabilityService {
    // Kiểm tra tài xế theo driverId (chính là userId), nếu hợp lệ và AVAILABLE thì trả về DriverProfileResponse
    DriverProfileResponse checkAndGetAvailableDriver(UUID driverId);

    // Cập nhật trạng thái theo driverId
    void updateAvailability(UpdateAvailabilityRequest request);
}