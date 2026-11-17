package com.driverapp.feedbackservice.service.impl;

import com.driverapp.feedbackservice.client.UserServiceClient;
import com.driverapp.feedbackservice.dto.request.CreateComplaintRequest;
import com.driverapp.feedbackservice.dto.request.UpdateComplaintStatusRequest;
import com.driverapp.feedbackservice.dto.response.ComplaintDetailResponse;
import com.driverapp.feedbackservice.dto.response.ComplaintSummaryResponse;
import com.driverapp.feedbackservice.dto.response.UserInfoResponse;
import com.driverapp.feedbackservice.models.UserComplaination;
import com.driverapp.feedbackservice.models.enums.ComplainationStatus;
import com.driverapp.feedbackservice.models.enums.ReportType;
import com.driverapp.feedbackservice.repository.UserComplainationRepository;
import com.driverapp.feedbackservice.service.ComplaintService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ComplaintServiceImpl implements ComplaintService {

    private final UserComplainationRepository userComplainationRepository;
    private final UserServiceClient userServiceClient;

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
            // driverId chính là userId của tài xế từ JWT
            finalDriverId = callerUserId;
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

    @Override
    @Transactional(readOnly = true)
    public Page<ComplaintSummaryResponse> listComplaints(
            ComplainationStatus status,
            ReportType reportType,
            Pageable pageable,
            Jwt jwt) {
        requireAdmin(jwt);

        Page<UserComplaination> page = reportType != null
                ? userComplainationRepository.findByStatusAndReportType(status, reportType, pageable)
                : userComplainationRepository.findByStatus(status, pageable);

        return page.map(c -> new ComplaintSummaryResponse(
                c.getId(),
                c.getReportType(),
                c.getStatus(),
                c.getTripId(),
                c.getCreatedAt()
        ));
    }

    @Override
    @Transactional(readOnly = true)
    public ComplaintDetailResponse getComplaintDetail(UUID complaintId, Jwt jwt) {
        requireAdmin(jwt);

        UserComplaination complaint = userComplainationRepository.findById(complaintId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy khiếu nại với id: " + complaintId));

        ComplaintDetailResponse.ParticipantInfo customer = fetchParticipant(complaint.getUserId());
        ComplaintDetailResponse.ParticipantInfo driver = fetchParticipant(complaint.getDriverId());

        return new ComplaintDetailResponse(
                complaint.getId(),
                complaint.getTripId(),
                complaint.getReportType(),
                complaint.getStatus(),
                customer,
                driver,
                complaint.getAdminNote(),
                complaint.getResolvedBy(),
                complaint.getResolvedAt(),
                complaint.getCreatedAt(),
                complaint.getUpdatedAt()
        );
    }

    @Override
    @Transactional
    public Map<String, String> updateStatus(
            UUID complaintId,
            UpdateComplaintStatusRequest request,
            Jwt jwt) {
        requireAdmin(jwt);

        if (request.status() == ComplainationStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "status phải là ACCEPTED hoặc REJECTED");
        }

        if (request.status() == ComplainationStatus.REJECTED
                && (request.adminNote() == null || request.adminNote().isBlank())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Cần nhập ghi chú (adminNote) khi từ chối khiếu nại");
        }

        UserComplaination complaint = userComplainationRepository.findById(complaintId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy khiếu nại với id: " + complaintId));

        if (complaint.getStatus() != ComplainationStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Khiếu nại đã được xử lý trước đó");
        }

        complaint.setStatus(request.status());
        complaint.setAdminNote(
                request.adminNote() != null && !request.adminNote().isBlank()
                        ? request.adminNote().trim()
                        : null
        );
        complaint.setResolvedBy(UUID.fromString(jwt.getSubject()));
        complaint.setResolvedAt(LocalDateTime.now());

        userComplainationRepository.save(complaint);
        log.info("Admin {} đã xử lý khiếu nại {} -> {}", jwt.getSubject(), complaintId, request.status());

        return Map.of("message", "Cập nhật trạng thái khiếu nại thành công");
    }

    private void requireAdmin(Jwt jwt) {
        List<String> roles = jwt != null ? jwt.getClaimAsStringList("roles") : List.of();
        if (roles == null || !roles.contains("ADMIN")) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Chỉ Admin mới có quyền thực hiện thao tác này");
        }
    }

    private ComplaintDetailResponse.ParticipantInfo fetchParticipant(UUID userId) {
        try {
            UserInfoResponse info = userServiceClient.getUserInfo(userId);
            if (info != null) {
                return new ComplaintDetailResponse.ParticipantInfo(
                        userId, info.username(), info.phoneNumber());
            }
        } catch (Exception ex) {
            log.warn("Không lấy được thông tin userId={} từ userservice: {}", userId, ex.getMessage());
        }
        return new ComplaintDetailResponse.ParticipantInfo(userId, null, null);
    }
}
