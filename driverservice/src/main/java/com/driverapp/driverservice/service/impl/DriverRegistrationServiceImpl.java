package com.driverapp.driverservice.service.impl;

import com.driverapp.driverservice.dto.request.RegisterDriverRequest;
import com.driverapp.driverservice.dto.request.UpdateDriverRegistrationRequest;
import com.driverapp.driverservice.dto.response.RegisterDriverResponse;
import com.driverapp.driverservice.models.Driver;
import com.driverapp.driverservice.models.DriverDocument;
import com.driverapp.driverservice.models.DriverVehicle;
import com.driverapp.driverservice.models.enums.DocumentType;
import com.driverapp.driverservice.models.enums.VerificationStatus;
import com.driverapp.driverservice.repository.DriverDocumentRepository;
import com.driverapp.driverservice.repository.DriverRepository;
import com.driverapp.driverservice.repository.DriverVehicleRepository;
import com.driverapp.driverservice.service.DriverRegistrationService;
import com.driverapp.driverservice.storage.DriverImageStorage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@Service
@RequiredArgsConstructor
public class DriverRegistrationServiceImpl implements DriverRegistrationService {
    private final DriverRepository driverRepository;
    private final DriverDocumentRepository documentRepository;
    private final DriverVehicleRepository vehicleRepository;
    private final DriverImageStorage imageStorage;

    @Override
    @Transactional
    public RegisterDriverResponse register(UUID userId, String username, RegisterDriverRequest request) {
        if (driverRepository.existsByUserId(userId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "User already has a driver profile"
            );
        }

        imageStorage.validate(request.idCardFront());
        imageStorage.validate(request.idCardBack());
        imageStorage.validate(request.driverLicenseFront());
        imageStorage.validate(request.driverLicenseBack());
        imageStorage.validate(request.registrationFront());
        imageStorage.validate(request.plate());

        if (request.vehicleType() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "vehicleType is required"
            );
        }

        Driver driver = driverRepository.saveAndFlush(
                Driver.builder()
                        .userId(userId)
                        .verificationStatus(VerificationStatus.PENDING)
                        .build()
        );

        // Nếu transaction DB rollback, xóa các ảnh vừa upload.
        List<String> uploadedUrls = new ArrayList<>();

        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        if (status != STATUS_COMMITTED) {
                            uploadedUrls.forEach(imageStorage::deleteQuietly);
                        }
                    }
                }
        );

        // Upload từng ảnh theo đường dẫn mới: driver/{username}/{folder}/{fileName}
        String idCardFrontUrl  = track(imageStorage.uploadIdCardFront(username, request.idCardFront()), uploadedUrls);
        String idCardBackUrl   = track(imageStorage.uploadIdCardBack(username, request.idCardBack()), uploadedUrls);
        String licenseFrontUrl = track(imageStorage.uploadDriverLicenseFront(username, request.driverLicenseFront()), uploadedUrls);
        String licenseBackUrl  = track(imageStorage.uploadDriverLicenseBack(username, request.driverLicenseBack()), uploadedUrls);
        String registrationUrl = track(imageStorage.uploadRegistrationFront(username, request.registrationFront()), uploadedUrls);
        String plateUrl        = track(imageStorage.uploadPlate(username, request.plate()), uploadedUrls);

        documentRepository.save(
                document(driver, DocumentType.ID_CARD, idCardFrontUrl, idCardBackUrl)
        );
        documentRepository.save(
                document(driver, DocumentType.DRIVER_LICENSE, licenseFrontUrl, licenseBackUrl)
        );

        vehicleRepository.save(
                DriverVehicle.builder()
                        .driver(driver)
                        .registrationFrontUrl(registrationUrl)
                        .plateImgUrl(plateUrl)
                        .vehicleType(request.vehicleType())
                        .build()
        );

        return new RegisterDriverResponse(
                driver.getId(),
                VerificationStatus.PENDING,
                "Driver registration submitted"
        );
    }

    private String track(String url, List<String> uploadedUrls) {
        uploadedUrls.add(url);
        return url;
    }

    private DriverDocument document(
            Driver driver,
            DocumentType type,
            String frontUrl,
            String backUrl
    ) {
        return DriverDocument.builder()
                .driver(driver)
                .documentType(type)
                .frontImgUrl(frontUrl)
                .backImgUrl(backUrl)
                .build();
    }

    @Override
    @Transactional
    public void updateRegistration(
            UUID userId,
            String username,
            UpdateDriverRegistrationRequest request) {

        // 1. Kiểm tra tồn tại của hồ sơ tài xế
        Driver driver = driverRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Driver profile not found. Please register first."
                ));

        // 2. Không cho phép sửa nếu hồ sơ đã APPROVED
        if (driver.getVerificationStatus() == VerificationStatus.APPROVED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cannot update registration details. Driver profile is already APPROVED."
            );
        }

        // 3. Phải có ít nhất 1 file được gửi lên
        if (!request.hasAtLeastOneFile()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "At least one image file must be provided for update"
            );
        }

        // 4. Validate từng file được cung cấp
        validateIfPresent(request.idCardFront());
        validateIfPresent(request.idCardBack());
        validateIfPresent(request.driverLicenseFront());
        validateIfPresent(request.driverLicenseBack());
        validateIfPresent(request.registrationFront());
        validateIfPresent(request.plate());

        // 5. Lấy danh sách tài liệu hiện có trong Database
        List<DriverDocument> documents = documentRepository.findByDriver(driver);
        Map<DocumentType, DriverDocument> docMap = documents.stream()
                .collect(Collectors.toMap(DriverDocument::getDocumentType, d -> d, (d1, d2) -> d1));

        DriverVehicle vehicle = vehicleRepository.findFirstByDriverOrderByCreatedAtDesc(driver)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Vehicle record not found for driver"
                ));

        // 6. Ghi đè ảnh CCCD mặt trước / mặt sau qua Lombok setter
        DriverDocument idCardDoc = docMap.get(DocumentType.ID_CARD);
        if (request.idCardFront() != null && !request.idCardFront().isEmpty()) {
            String newUrl = imageStorage.overwriteIdCardFront(
                    username,
                    idCardDoc != null ? idCardDoc.getFrontImgUrl() : null,
                    request.idCardFront()
            );
            if (idCardDoc != null) {
                idCardDoc.setFrontImgUrl(newUrl);
            }
        }
        if (request.idCardBack() != null && !request.idCardBack().isEmpty()) {
            String newUrl = imageStorage.overwriteIdCardBack(
                    username,
                    idCardDoc != null ? idCardDoc.getBackImgUrl() : null,
                    request.idCardBack()
            );
            if (idCardDoc != null) {
                idCardDoc.setBackImgUrl(newUrl);
            }
        }

        // 7. Ghi đè ảnh Bằng lái mặt trước / mặt sau qua Lombok setter
        DriverDocument licenseDoc = docMap.get(DocumentType.DRIVER_LICENSE);
        if (request.driverLicenseFront() != null && !request.driverLicenseFront().isEmpty()) {
            String newUrl = imageStorage.overwriteDriverLicenseFront(
                    username,
                    licenseDoc != null ? licenseDoc.getFrontImgUrl() : null,
                    request.driverLicenseFront()
            );
            if (licenseDoc != null) {
                licenseDoc.setFrontImgUrl(newUrl);
            }
        }
        if (request.driverLicenseBack() != null && !request.driverLicenseBack().isEmpty()) {
            String newUrl = imageStorage.overwriteDriverLicenseBack(
                    username,
                    licenseDoc != null ? licenseDoc.getBackImgUrl() : null,
                    request.driverLicenseBack()
            );
            if (licenseDoc != null) {
                licenseDoc.setBackImgUrl(newUrl);
            }
        }

        // 8. Ghi đè ảnh đăng ký xe & biển số qua Lombok setter
        if (request.registrationFront() != null && !request.registrationFront().isEmpty()) {
            String newUrl = imageStorage.overwriteRegistrationFront(
                    username,
                    vehicle.getRegistrationFrontUrl(),
                    request.registrationFront()
            );
            vehicle.setRegistrationFrontUrl(newUrl);
        }
        if (request.plate() != null && !request.plate().isEmpty()) {
            String newUrl = imageStorage.overwritePlate(
                    username,
                    vehicle.getPlateImgUrl(),
                    request.plate()
            );
            vehicle.setPlateImgUrl(newUrl);
        }

        // 9. Nếu hồ sơ từng bị REJECTED, tự động chuyển về PENDING để Admin duyệt lại qua Lombok setter
        if (driver.getVerificationStatus() == VerificationStatus.REJECTED) {
            driver.setVerificationStatus(VerificationStatus.PENDING);
            driver.setRejectionReason(null);
            log.info("Driver {} resubmitted registration after rejection", driver.getId());
        }

        // Lưu cập nhật vào DB
        driverRepository.save(driver);
        if (idCardDoc != null) documentRepository.save(idCardDoc);
        if (licenseDoc != null) documentRepository.save(licenseDoc);
        vehicleRepository.save(vehicle);
    }

    private void validateIfPresent(org.springframework.web.multipart.MultipartFile file) {
        if (file != null && !file.isEmpty()) {
            imageStorage.validate(file);
        }
    }
}