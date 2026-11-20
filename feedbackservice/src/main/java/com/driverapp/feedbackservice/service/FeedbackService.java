package com.driverapp.feedbackservice.service;

import com.driverapp.feedbackservice.dto.request.CreateFeedbackRequest;
import com.driverapp.feedbackservice.dto.request.CreateFoodFeedbackRequest;
import com.driverapp.feedbackservice.dto.request.CreateRestaurantFeedbackRequest;
import com.driverapp.feedbackservice.dto.response.TripFeedbackCommentResponse;
import org.springframework.data.domain.Page;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Map;
import java.util.UUID;

public interface FeedbackService {

    /** Khách hàng đánh giá tài xế */
    Map<String, Object> createDriverFeedback(CreateFeedbackRequest request, Jwt jwt);

    /** Khách hàng đánh giá nhà hàng */
    Map<String, Object> createRestaurantFeedback(CreateRestaurantFeedbackRequest request, Jwt jwt);

    /** Khách hàng đánh giá món ăn */
    Map<String, Object> createFoodFeedback(CreateFoodFeedbackRequest request, Jwt jwt);

    /** Kiểm tra xem chuyến đi đã được đánh giá chưa */
    Map<String, Object> getTripFeedbackStatus(String tripId, Jwt jwt);

    /** Lấy comment đánh giá của khách hàng cho tài xế theo chuyến đi (không lấy ID) */
    Page<TripFeedbackCommentResponse> getDriverTripFeedbacks(UUID driverId, String tripId, int page, int size);
}
