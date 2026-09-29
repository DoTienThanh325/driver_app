package com.driverapp.driverservice.service.impl;

import com.driverapp.driverservice.dto.request.AddVehicleRequest;
import com.driverapp.driverservice.dto.response.AddVehicleResponse;
import com.driverapp.driverservice.models.enums.DocumentType;
import com.driverapp.driverservice.models.Driver;
import com.driverapp.driverservice.models.DriverDocument;
import com.driverapp.driverservice.models.DriverVehicle;
import com.driverapp.driverservice.models.enums.VerificationStatus;
import com.driverapp.driverservice.repository.DriverDocumentRepository;
import com.driverapp.driverservice.repository.DriverRepository;
import com.driverapp.driverservice.repository.DriverVehicleRepository;
import com.driverapp.driverservice.service.DriverVehicleService;
import com.driverapp.driverservice.storage.DriverImageStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DriverVehicleServiceImpl implements DriverVehicleService {
    private final DriverRepository driverRepository;
    private final DriverDocumentRepository documentRepository;
    private final DriverVehicleRepository vehicleRepository;
    private final DriverImageStorage imageStorage;

    @Override
    @Transactional
    public AddVehicleResponse addVehicle(UUID userId, AddVehicleRequest request) {
        // ── BƯỚC 1: Tìm driver từ userId ─────────────────────────────────────
        Driver driver = driverRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Driver profile not found. Please register as a driver first."));

        // ── BƯỚC 2: Chỉ tài xế APPROVED mới được thêm phương tiện ───────────
        if (driver.getVerificationStatus() != VerificationStatus.APPROVED) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Driver profile is not approved yet. Current status: "
                            + driver.getVerificationStatus());
        }

        // ── BƯỚC 3: Validate các ảnh bắt buộc ───────────────────────────────
        if (request.vehicleType() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "vehicleType is required");
        }

        imageStorage.validate(request.registrationFront());
        imageStorage.validate(request.plate());

        // ── BƯỚC 4: Kiểm tra có cần lưu DRIVER_LICENSE không ─────────────────
        boolean hasLicense = documentRepository.existsByDriverAndDocumentType(
                driver, DocumentType.DRIVER_LICENSE);
        boolean needLicense = !hasLicense; // Yêu cầu bằng lái cho tất cả loại xe

        if (needLicense) {
            // Nếu cần bằng lái mà client không gửi ảnh -> báo lỗi rõ ràng
            if (request.driverLicenseFront() == null || request.driverLicenseFront().isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Driver license front image is required when adding a car for the first time.");
            }
            if (request.driverLicenseBack() == null || request.driverLicenseBack().isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Driver license back image is required when adding a car for the first time.");
            }
            imageStorage.validate(request.driverLicenseFront());
            imageStorage.validate(request.driverLicenseBack());
        }

        // ── BƯỚC 5: Đăng ký dọn dẹp ảnh nếu transaction DB bị rollback ──────
        // Pattern giống hệt DriverRegistrationServiceImpl
        List<String> uploadedUrls = new ArrayList<>();
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        if (status != STATUS_COMMITTED) {
                            uploadedUrls.forEach(imageStorage::deleteQuietly);
                        }
                    }
                });

        // ── BƯỚC 6: Upload ảnh xe lên MinIO ──────────────────────────────────
        String registrationUrl = upload(
                userId, "registration", request.registrationFront(), uploadedUrls);
        String plateUrl = upload(
                userId, "plate", request.plate(), uploadedUrls);

        // ── BƯỚC 7: Lưu DRIVER_LICENSE nếu cần ───────────────────────────────
        if (needLicense) {
            String licenseFrontUrl = upload(
                    userId, "driver-license", request.driverLicenseFront(), uploadedUrls);
            String licenseBackUrl = upload(
                    userId, "driver-license", request.driverLicenseBack(), uploadedUrls);
            documentRepository.save(
                    DriverDocument.builder()
                            .driver(driver)
                            .documentType(DocumentType.DRIVER_LICENSE)
                            .frontImgUrl(licenseFrontUrl)
                            .backImgUrl(licenseBackUrl)
                            .build());
        }

        // ── BƯỚC 8: Lưu thông tin xe mới ─────────────────────────────────────
        DriverVehicle vehicle = vehicleRepository.save(
                DriverVehicle.builder()
                        .driver(driver)
                        .registrationFrontUrl(registrationUrl)
                        .plateImgUrl(plateUrl)
                        .vehicleType(request.vehicleType())
                        .build());

        return new AddVehicleResponse(
                vehicle.getId(),
                vehicle.getVehicleType(),
                "Vehicle added successfully.");
    }

    // ── Helper: upload ảnh và track URL để rollback nếu cần ──────────────────
    private String upload(
            UUID userId,
            String kind,
            MultipartFile file,
            List<String> uploadedUrls) {
        String url = imageStorage.upload(userId, kind, file);
        uploadedUrls.add(url);
        return url;
    }
}