package com.driverapp.driverservice.service.impl;

import com.driverapp.driverservice.client.UserServiceClient;
import com.driverapp.driverservice.dto.response.DriverCandidateResponse;
import com.driverapp.driverservice.dto.response.DriverDetailResponse;
import com.driverapp.driverservice.dto.response.DriverDetailResponse.DocumentImagePair;
import com.driverapp.driverservice.dto.response.DriverDetailResponse.VehicleDetail;
import com.driverapp.driverservice.dto.response.UserInfoResponse;
import com.driverapp.driverservice.models.Driver;
import com.driverapp.driverservice.models.DriverDocument;
import com.driverapp.driverservice.models.enums.DocumentType;
import com.driverapp.driverservice.models.enums.VerificationStatus;
import com.driverapp.driverservice.repository.DriverDocumentRepository;
import com.driverapp.driverservice.repository.DriverRepository;
import com.driverapp.driverservice.repository.DriverVehicleRepository;
import com.driverapp.driverservice.service.DriverCandidateService;
import com.driverapp.driverservice.storage.DriverImageStorage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DriverCandidateServiceImpl implements DriverCandidateService {

    private final DriverRepository driverRepository;
    private final DriverDocumentRepository documentRepository;
    private final DriverVehicleRepository vehicleRepository;
    private final UserServiceClient userServiceClient;
    private final DriverImageStorage imageStorage;

    @Override
    @Transactional(readOnly = true)
    public List<DriverCandidateResponse> getPendingCandidates() {
        List<Driver> pendingDrivers = driverRepository.findByVerificationStatusOrderByCreatedAtDesc(
                VerificationStatus.PENDING);

        log.info("Found {} pending driver candidates", pendingDrivers.size());

        return pendingDrivers.stream().map(driver -> {
            UserInfoResponse userInfo = userServiceClient.getUserInfo(driver.getUserId());
            return new DriverCandidateResponse(
                    driver.getId(),
                    userInfo.username(),
                    userInfo.phoneNumber(),
                    driver.getVerificationStatus(),
                    driver.getCreatedAt());
        }).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DriverDetailResponse getDriverDetail(UUID driverId, UUID currentUserId, List<String> roles) {
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Driver not found with id: " + driverId));

        boolean isAdmin = roles != null && roles.contains("ADMIN");
        if (!isAdmin) {
            if (currentUserId == null || !driver.getUserId().equals(currentUserId)) {
                log.warn("Access denied: user {} attempted to access driver profile {}", currentUserId, driverId);
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Access denied: You can only view your own registered driver profile");
            }
        }

        UserInfoResponse userInfo = userServiceClient.getUserInfo(driver.getUserId());
        List<DriverDocument> documents = documentRepository.findByDriver(driver);
        Map<DocumentType, DriverDocument> docMap = documents.stream()
                .collect(Collectors.toMap(DriverDocument::getDocumentType, doc -> doc, (d1, d2) -> d1));

        DocumentImagePair idCardPair = null;
        DriverDocument idCardDoc = docMap.get(DocumentType.ID_CARD);
        if (idCardDoc != null) {
            idCardPair = new DocumentImagePair(
                    toPresignedUrl(idCardDoc.getFrontImgUrl()),
                    toPresignedUrl(idCardDoc.getBackImgUrl()));
        }
        DocumentImagePair licensePair = null;

        DriverDocument licenseDoc = docMap.get(DocumentType.DRIVER_LICENSE);
        if (licenseDoc != null) {
            licensePair = new DocumentImagePair(
                    toPresignedUrl(licenseDoc.getFrontImgUrl()),
                    toPresignedUrl(licenseDoc.getBackImgUrl()));
        }

        VehicleDetail vehicleDetail = vehicleRepository.findFirstByDriverOrderByCreatedAtDesc(driver)
                .map(vehicle -> new VehicleDetail(
                        vehicle.getVehicleType(),
                        toPresignedUrl(vehicle.getRegistrationFrontUrl()),
                        toPresignedUrl(vehicle.getPlateImgUrl())))
                .orElse(null);

        return new DriverDetailResponse(
                driver.getId(),
                userInfo.username(),
                userInfo.phoneNumber(),
                driver.getVerificationStatus(),
                driver.getCreatedAt(),
                idCardPair,
                licensePair,
                vehicleDetail);
    }

    private String toPresignedUrl(String objectUrl) {
        if (objectUrl == null || objectUrl.isBlank()) {
            return null;
        }
        try {
            return imageStorage.signedReadUrl(objectUrl);
        } catch (Exception e) {
            log.warn("Failed to generate presigned URL for {}: {}", objectUrl, e.getMessage());
            return null;
        }
    }
}
