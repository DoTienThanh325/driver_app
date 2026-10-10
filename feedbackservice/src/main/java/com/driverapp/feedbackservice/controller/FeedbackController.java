package com.driverapp.feedbackservice.controller;

import com.driverapp.feedbackservice.dto.request.CreateFeedbackRequest;
import com.driverapp.feedbackservice.service.FeedbackService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/feedbacks")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    /**
     * POST /api/feedbacks
     * Khách hàng gửi đánh giá tài xế cho chuyến đi
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> createFeedback(
            @Valid @RequestBody CreateFeedbackRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return feedbackService.createDriverFeedback(request, jwt);
    }
}
