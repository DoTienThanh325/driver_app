package com.driverapp.driverservice.dto.request;

import com.driverapp.driverservice.models.enums.VehicleType;
import org.springframework.web.multipart.MultipartFile;

// Dùng Java Record giống pattern hiện có trong project
// driverLicenseFront và driverLicenseBack là Optional (nullable)
// - Bắt buộc khi vehicleType == CAR và tài xế chưa có DRIVER_LICENSE
// - Bỏ qua khi đã có bằng lái từ trước hoặc thêm MOTORBIKE
public record AddVehicleRequest(
        MultipartFile registrationFront, // Bắt buộc: Ảnh giấy tờ xe
        MultipartFile plate, // Bắt buộc: Ảnh biển số xe
        MultipartFile driverLicenseFront, // Tuỳ chọn: Mặt trước bằng lái (nếu cần)
        MultipartFile driverLicenseBack, // Tuỳ chọn: Mặt sau bằng lái (nếu cần)
        VehicleType vehicleType // Bắt buộc: MOTORBIKE hoặc CAR
) {}