package com.driverapp.feedbackservice.controller;

import com.driverapp.feedbackservice.dto.request.CreateFeedbackRequest;
import com.driverapp.feedbackservice.dto.response.TripFeedbackCommentResponse;
import com.driverapp.feedbackservice.service.FeedbackService;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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

    /**
     * GET /api/feedbacks/driver/trip-reviews
     * Lấy các comment đánh giá của khách hàng cho tài xế theo chuyến đi.
     * Yêu cầu: tên người, nội dung, thời gian, sao (nói chung không lấy id).
     */
    @GetMapping("/driver/trip-reviews")
    public Page<TripFeedbackCommentResponse> getDriverTripFeedbacks(
            @RequestParam(required = false) String tripId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal Jwt jwt) {
        UUID driverUserId = UUID.fromString(jwt.getSubject());
        return feedbackService.getDriverTripFeedbacks(driverUserId, tripId, page, size);
    }
}
