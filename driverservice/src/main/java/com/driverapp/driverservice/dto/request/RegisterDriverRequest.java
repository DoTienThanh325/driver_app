package com.driverapp.driverservice.dto.request;

import org.springframework.web.multipart.MultipartFile;

import com.driverapp.driverservice.models.enums.VehicleType;

public record RegisterDriverRequest(
    MultipartFile idCardFront,
    MultipartFile idCardBack,
    MultipartFile driverLicenseFront,
    MultipartFile driverLicenseBack,
    MultipartFile registrationFront,
    MultipartFile plate,
    VehicleType vehicleType
) {}