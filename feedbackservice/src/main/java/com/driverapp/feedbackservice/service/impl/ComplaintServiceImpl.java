package com.driverapp.feedbackservice.service.impl;

import com.driverapp.feedbackservice.client.DriverServiceClient;
import com.driverapp.feedbackservice.dto.request.CreateComplaintRequest;
import com.driverapp.feedbackservice.models.UserComplaination;
import com.driverapp.feedbackservice.models.enums.ComplainationStatus;
import com.driverapp.feedbackservice.repository.UserComplainationRepository;
import com.driverapp.feedbackservice.service.ComplaintService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ComplaintServiceImpl implements ComplaintService {

    private final UserComplainationRepository userComplainationRepository;
    private final DriverServiceClient driverServiceClient;

    @Override
    @Transactional
    public Map<String, String> createComplaint(CreateComplaintRequest request, Jwt jwt) {
        UUID callerUserId = UUID.fromString(jwt.getSubject());
        List<String> roles = jwt.getClaimAsStringList("roles");
        if (roles == null) {
            roles = List.of();
        }

        boolean isDriver = roles.contains("DRIVER");
        boolean isCustomer = roles.contains("CUSTOMER");

        UUID finalUserId;
        UUID finalDriverId;

        if (isDriver) {
            // Khi tài xế báo cáo:
            if (request.getCustomerId() == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Mã khách hàng (customerId) là bắt buộc khi tài xế báo cáo");
            }
            finalUserId = request.getCustomerId();
            // Tra cứu driverId thực tế qua driverservice
            finalDriverId = driverServiceClient.getDriverIdByUserId(callerUserId);
        } else if (isCustomer) {
            // Khi khách hàng báo cáo:
            if (request.getDriverId() == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Mã tài xế (driverId) là bắt buộc khi khách hàng báo cáo");
            }
            finalUserId = callerUserId;
            finalDriverId = request.getDriverId();
        } else {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ có khách hàng hoặc tài xế mới có quyền tạo khiếu nại chuyến đi");
        }

        UserComplaination complaint = UserComplaination.builder()
                .userId(finalUserId)
                .driverId(finalDriverId)
                .tripId(request.getTripId())
                .reportType(request.getReportType())
                .status(ComplainationStatus.PENDING)
                .build();

        userComplainationRepository.save(complaint);

        log.info("Đã tạo khiếu nại thành công: id={}, reporterUserId={}, tripId={}, reportType={}",
                complaint.getId(), callerUserId, request.getTripId(), request.getReportType());

        return Map.of("message", "Tạo khiếu nại thành công");
    }
}
