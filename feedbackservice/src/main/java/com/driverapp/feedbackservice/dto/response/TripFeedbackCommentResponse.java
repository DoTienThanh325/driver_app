package com.driverapp.feedbackservice.dto.response;

import java.time.LocalDateTime;

/**
 * DTO phản hồi comment đánh giá của khách hàng cho tài xế theo chuyến đi.
 * TUYỆT ĐỐI KHÔNG CHỨA BẤT KỲ TRƯỜNG ID NÀO.
 */
public record TripFeedbackCommentResponse(
        String reviewerName,
        String content,
        LocalDateTime createdAt,
        Double rating
) {}
