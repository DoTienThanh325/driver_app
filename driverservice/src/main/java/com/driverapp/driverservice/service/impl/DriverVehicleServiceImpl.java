package com.driverapp.driverservice.service.impl;

import com.driverapp.driverservice.dto.request.AddVehicleRequest;
import com.driverapp.driverservice.dto.response.AddVehicleResponse;
import com.driverapp.driverservice.models.Driver;
import com.driverapp.driverservice.models.DriverDocument;
import com.driverapp.driverservice.models.DriverVehicle;
import com.driverapp.driverservice.models.enums.DocumentType;
import com.driverapp.driverservice.models.enums.VehicleType;
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
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DriverVehicleServiceImpl implements DriverVehicleService {

    private final DriverDocumentRepository documentRepository;
    private final DriverVehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;
    private final DriverImageStorage imageStorage;

    @Override
    @Transactional
    public AddVehicleResponse addVehicle(UUID userId, String username, AddVehicleRequest request) {
        // ── STEP 1: Validate mandatory input ────────────────────────────────
        if (request.vehicleType() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "vehicleType is required");
        }

        imageStorage.validate(request.registrationFront());
        imageStorage.validate(request.plate());

        // ── STEP 2: Kiểm tra bằng lái theo loại xe (Xe máy vs Ô tô) ─────────────
        VehicleType vehicleType = request.vehicleType();
        DocumentType requiredLicenseType = (vehicleType == VehicleType.CAR)
                ? DocumentType.DRIVER_LICENSE_CAR
                : DocumentType.DRIVER_LICENSE_MOTORBIKE;

        boolean hasLicense = documentRepository.existsByDriver_UserIdAndDocumentType(userId, requiredLicenseType);
        if (!hasLicense) {
            // Kiểm tra tương thích dữ liệu cũ: nếu đã có DRIVER_LICENSE và xe cũ cùng vehicleType
            boolean hasLegacyLicense = documentRepository.existsByDriver_UserIdAndDocumentType(userId, DocumentType.DRIVER_LICENSE);
            if (hasLegacyLicense) {
                boolean hasSameTypeVehicle = vehicleRepository.findByDriver_UserId(userId).stream()
                        .anyMatch(v -> v.getVehicleType() == vehicleType);
                if (hasSameTypeVehicle) {
                    hasLicense = true;
                }
            }
        }
        boolean needLicense = !hasLicense;

        if (needLicense) {
            String typeLabel = (vehicleType == VehicleType.CAR) ? "ô tô" : "xe máy";
            if (request.driverLicenseFront() == null || request.driverLicenseFront().isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Bạn chưa có bằng lái " + typeLabel + ". Vui lòng tải lên ảnh mặt trước giấy phép lái xe " + typeLabel + ".");
            }
            if (request.driverLicenseBack() == null || request.driverLicenseBack().isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Bạn chưa có bằng lái " + typeLabel + ". Vui lòng tải lên ảnh mặt sau giấy phép lái xe " + typeLabel + ".");
            }
            imageStorage.validate(request.driverLicenseFront());
            imageStorage.validate(request.driverLicenseBack());
        }

        // ── STEP 3: Tính index xe trực tiếp bằng userId ──────────────────────
        long vehicleIndex = vehicleRepository.countByDriver_UserId(userId) + 1;

        // ── STEP 4: Transaction rollback cleanup hook ────────────────────────
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

        // ── STEP 5: Upload ảnh lên MinIO ─────────────────────────────────────
        String registrationUrl = track(
                imageStorage.uploadRegistrationFrontIndexed(username, vehicleIndex, request.registrationFront()),
                uploadedUrls);
        String plateUrl = track(
                imageStorage.uploadPlateIndexed(username, vehicleIndex, request.plate()),
                uploadedUrls);

        // Lấy driver reference từ entity document đã có hoặc repository
        Driver driver = documentRepository.findFirstByDriver_UserId(userId)
                .map(DriverDocument::getDriver)
                .orElseGet(() -> driverRepository.findByUserId(userId)
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND, "Driver profile not found for user: " + userId)));

        // ── STEP 6: Lưu bằng lái nếu cần ────────────────────────────────────
        if (needLicense) {
            String licenseFrontUrl;
            String licenseBackUrl;
            if (vehicleType == VehicleType.CAR) {
                licenseFrontUrl = track(
                        imageStorage.uploadDriverLicenseCarFront(username, request.driverLicenseFront()),
                        uploadedUrls);
                licenseBackUrl = track(
                        imageStorage.uploadDriverLicenseCarBack(username, request.driverLicenseBack()),
                        uploadedUrls);
            } else {
                licenseFrontUrl = track(
                        imageStorage.uploadDriverLicenseMotorbikeFront(username, request.driverLicenseFront()),
                        uploadedUrls);
                licenseBackUrl = track(
                        imageStorage.uploadDriverLicenseMotorbikeBack(username, request.driverLicenseBack()),
                        uploadedUrls);
            }
            documentRepository.save(
                    DriverDocument.builder()
                            .driver(driver)
                            .documentType(requiredLicenseType)
                            .frontImgUrl(licenseFrontUrl)
                            .backImgUrl(licenseBackUrl)
                            .build());
        }

        // ── STEP 7: Lưu thông tin xe mới (status = PENDING) ──────────────────
        DriverVehicle vehicle = vehicleRepository.save(
                DriverVehicle.builder()
                        .driver(driver)
                        .registrationFrontUrl(registrationUrl)
                        .plateImgUrl(plateUrl)
                        .vehicleType(request.vehicleType())
                        .status(VerificationStatus.PENDING)
                        .build());

        return new AddVehicleResponse(
                vehicle.getId(),
                vehicle.getVehicleType(),
                "Vehicle added successfully.");
    }

    private String track(String url, List<String> uploadedUrls) {
        uploadedUrls.add(url);
        return url;
    }
}