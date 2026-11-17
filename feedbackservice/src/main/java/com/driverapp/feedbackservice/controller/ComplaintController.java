package com.driverapp.feedbackservice.controller;

import com.driverapp.feedbackservice.dto.request.CreateComplaintRequest;
import com.driverapp.feedbackservice.dto.request.UpdateComplaintStatusRequest;
import com.driverapp.feedbackservice.dto.response.ComplaintDetailResponse;
import com.driverapp.feedbackservice.dto.response.ComplaintSummaryResponse;
import com.driverapp.feedbackservice.models.enums.ComplainationStatus;
import com.driverapp.feedbackservice.models.enums.ReportType;
import com.driverapp.feedbackservice.service.ComplaintService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/complaints")
@RequiredArgsConstructor
public class ComplaintController {

    private final ComplaintService complaintService;

    /**
     * POST /api/complaints
     * Tạo báo cáo khiếu nại vi phạm chuyến đi (dành cho CUSTOMER và DRIVER).
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> createComplaint(
            @Valid @RequestBody CreateComplaintRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return complaintService.createComplaint(request, jwt);
    }

    /**
     * GET /api/complaints?status=PENDING&reportType=...&page=0&size=20
     * Admin xem danh sách khiếu nại theo trạng thái (thông tin gọn, phân trang).
     */
    @GetMapping
    public Page<ComplaintSummaryResponse> listComplaints(
            @RequestParam(defaultValue = "PENDING") ComplainationStatus status,
            @RequestParam(required = false) ReportType reportType,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal Jwt jwt) {
        return complaintService.listComplaints(status, reportType, pageable, jwt);
    }

    /**
     * GET /api/complaints/{id}
     * Admin xem chi tiết đầy đủ của một khiếu nại.
     */
    @GetMapping("/{id}")
    public ComplaintDetailResponse getComplaintDetail(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        return complaintService.getComplaintDetail(id, jwt);
    }

    /**
     * PATCH /api/complaints/{id}/status
     * Admin xử lý khiếu nại (ACCEPTED hoặc REJECTED).
     */
    @PatchMapping("/{id}/status")
    public Map<String, String> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateComplaintStatusRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return complaintService.updateStatus(id, request, jwt);
    }
}
