package com.driverapp.feedbackservice.service;

import com.driverapp.feedbackservice.dto.request.CreateComplaintRequest;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Map;

public interface ComplaintService {

    /**
     * Tạo báo cáo khiếu nại chuyến đi (hỗ trợ cả Customer và Driver).
     */
    Map<String, String> createComplaint(CreateComplaintRequest request, Jwt jwt);
}
