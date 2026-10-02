package com.driverapp.driverservice.controller;

import com.driverapp.driverservice.dto.request.AddVehicleRequest;
import com.driverapp.driverservice.dto.response.AddVehicleResponse;
import com.driverapp.driverservice.models.enums.VehicleType;
import com.driverapp.driverservice.service.DriverVehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class DriverVehicleController {

    private final DriverVehicleService vehicleService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public AddVehicleResponse addVehicle(
            @AuthenticationPrincipal Jwt jwt,

            // Bắt buộc: Giấy tờ xe & Biển số
            @RequestPart("registrationFront") MultipartFile registrationFront,
            @RequestPart("plate") MultipartFile plate,

            // Tuỳ chọn: Bằng lái xe (chỉ bắt buộc khi thêm CAR lần đầu)
            @RequestPart(value = "driverLicenseFront", required = false) MultipartFile driverLicenseFront,
            @RequestPart(value = "driverLicenseBack", required = false) MultipartFile driverLicenseBack,

            // Loại xe: MOTORBIKE hoặc CAR
            @RequestParam("vehicleType") VehicleType vehicleType) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String username = jwt.getClaim("username");

        AddVehicleRequest request = new AddVehicleRequest(
                registrationFront,
                plate,
                driverLicenseFront,
                driverLicenseBack,
                vehicleType);

        return vehicleService.addVehicle(userId, username, request);
    }
}