package com.driverapp.feedbackservice.service;

import com.driverapp.feedbackservice.dto.request.CreateComplaintRequest;
import com.driverapp.feedbackservice.dto.request.UpdateComplaintStatusRequest;
import com.driverapp.feedbackservice.dto.response.ComplaintDetailResponse;
import com.driverapp.feedbackservice.dto.response.ComplaintSummaryResponse;
import com.driverapp.feedbackservice.models.enums.ComplainationStatus;
import com.driverapp.feedbackservice.models.enums.ReportType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Map;
import java.util.UUID;

public interface ComplaintService {
    Map<String, String> createComplaint(CreateComplaintRequest request, Jwt jwt);

    Page<ComplaintSummaryResponse> listComplaints(
            ComplainationStatus status,
            ReportType reportType,
            Pageable pageable,
            Jwt jwt);

    ComplaintDetailResponse getComplaintDetail(UUID complaintId, Jwt jwt);

    Map<String, String> updateStatus(
            UUID complaintId,
            UpdateComplaintStatusRequest request,
            Jwt jwt);
}
