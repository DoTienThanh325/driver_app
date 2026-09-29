package com.driverapp.driverservice.service.impl;

import com.driverapp.driverservice.dto.request.RegisterDriverRequest;
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

import java.util.*;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class DriverRegistrationServiceImpl implements DriverRegistrationService {
    private final DriverRepository driverRepository;
    private final DriverDocumentRepository documentRepository;
    private final DriverVehicleRepository vehicleRepository;
    private final DriverImageStorage imageStorage;

    @Override 
    @Transactional
    public RegisterDriverResponse register(UUID userId, RegisterDriverRequest request) {
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
                            uploadedUrls.forEach(
                                    imageStorage::deleteQuietly
                            );
                        }
                    }
                }
        );

        String idCardFrontUrl = upload(
                userId, "id-card", request.idCardFront(), uploadedUrls
        );
        String idCardBackUrl = upload(
                userId, "id-card", request.idCardBack(), uploadedUrls
        );
        String licenseFrontUrl = upload(
                userId, "driver-license",
                request.driverLicenseFront(), uploadedUrls
        );
        String licenseBackUrl = upload(
                userId, "driver-license",
                request.driverLicenseBack(), uploadedUrls
        );
        String registrationUrl = upload(
                userId, "registration",
                request.registrationFront(), uploadedUrls
        );
        String plateUrl = upload(
                userId, "plate", request.plate(), uploadedUrls
        );

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

    private String upload(
            UUID userId,
            String kind,
            MultipartFile file,
            List<String> uploadedUrls
    ) {
        String url = imageStorage.upload(userId, kind, file);
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
}
