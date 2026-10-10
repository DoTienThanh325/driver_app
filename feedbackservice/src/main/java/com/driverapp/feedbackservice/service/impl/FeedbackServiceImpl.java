package com.driverapp.feedbackservice.service.impl;

import com.driverapp.feedbackservice.dto.request.CreateFeedbackRequest;
import com.driverapp.feedbackservice.models.UserFeedback;
import com.driverapp.feedbackservice.repository.UserFeedbackRepository;
import com.driverapp.feedbackservice.service.FeedbackService;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackServiceImpl implements FeedbackService {

    private final UserFeedbackRepository userFeedbackRepository;

    @Override
    @Transactional
    public Map<String, String> createDriverFeedback(CreateFeedbackRequest request, Jwt jwt) {
        UUID customerUserId = UUID.fromString(jwt.getSubject());

        UserFeedback feedback = UserFeedback.builder()
                .userId(customerUserId)
                .driverId(request.getDriverId())
                .tripId(request.getTripId())
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        userFeedbackRepository.save(feedback);

        log.info("Khách hàng {} đã đánh giá tài xế {} cho chuyến đi {}: rating={}",
                customerUserId, request.getDriverId(), request.getTripId(), request.getRating());

        return Map.of("message", "Đánh giá tài xế thành công");
    }
}
