package com.driverapp.driverservice.controller;

import com.driverapp.driverservice.dto.request.RegisterDriverRequest;
import com.driverapp.driverservice.dto.request.UpdateDriverRegistrationRequest;
import com.driverapp.driverservice.dto.response.RegisterDriverResponse;
import com.driverapp.driverservice.models.enums.VehicleType;
import com.driverapp.driverservice.service.DriverRegistrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/drivers")
@RequiredArgsConstructor
public class DriverRegistrationController {
    private final DriverRegistrationService registrationService;

    @PostMapping(value = "/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterDriverResponse register(
            @AuthenticationPrincipal Jwt jwt,
            @RequestPart("idCardFront") MultipartFile idCardFront,
            @RequestPart("idCardBack") MultipartFile idCardBack,
            @RequestPart("driverLicenseFront") MultipartFile driverLicenseFront,
            @RequestPart("driverLicenseBack") MultipartFile driverLicenseBack,
            @RequestPart("registrationFront") MultipartFile registrationFront,
            @RequestPart("plate") MultipartFile plate,
            @RequestParam("vehicleType") VehicleType vehicleType) {
        RegisterDriverRequest request = new RegisterDriverRequest(
                idCardFront,
                idCardBack,
                driverLicenseFront,
                driverLicenseBack,
                registrationFront,
                plate,
                vehicleType);
        String username = jwt.getClaim("username");
        UUID userId = UUID.fromString(jwt.getSubject());
        return registrationService.register(userId, username, request);
    }

    /**
     * PATCH /api/drivers/registration
     * Customer chỉnh sửa thông tin/ảnh trong hồ sơ đăng ký tài xế.
     * Sử dụng HTTP PATCH linh hoạt khi cập nhật từng phần ảnh.
     * Tự động chuyển REJECTED -> PENDING để Admin duyệt lại.
     */
    @PatchMapping(value = "/registration", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.OK)
    public Map<String, String> updateRegistration(
            @AuthenticationPrincipal Jwt jwt,
            @RequestPart(value = "idCardFront", required = false) MultipartFile idCardFront,
            @RequestPart(value = "idCardBack", required = false) MultipartFile idCardBack,
            @RequestPart(value = "driverLicenseFront", required = false) MultipartFile driverLicenseFront,
            @RequestPart(value = "driverLicenseBack", required = false) MultipartFile driverLicenseBack,
            @RequestPart(value = "registrationFront", required = false) MultipartFile registrationFront,
            @RequestPart(value = "plate", required = false) MultipartFile plate) {

        UpdateDriverRegistrationRequest request = new UpdateDriverRegistrationRequest(
                idCardFront,
                idCardBack,
                driverLicenseFront,
                driverLicenseBack,
                registrationFront,
                plate
        );

        UUID userId = UUID.fromString(jwt.getSubject());
        String username = jwt.getClaim("username");

        registrationService.updateRegistration(userId, username, request);

        return Map.of("message", "Driver registration details updated successfully");
    }
}