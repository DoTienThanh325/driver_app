package com.driverapp.feedbackservice.service;

import com.driverapp.feedbackservice.dto.request.CreateFeedbackRequest;
import java.util.Map;
import org.springframework.security.oauth2.jwt.Jwt;

public interface FeedbackService {

    /** Khách hàng đánh giá tài xế */
    Map<String, String> createDriverFeedback(CreateFeedbackRequest request, Jwt jwt);
}
