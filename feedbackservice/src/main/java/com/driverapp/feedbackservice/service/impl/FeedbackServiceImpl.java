package com.driverapp.feedbackservice.service.impl;

import com.driverapp.feedbackservice.client.UserServiceClient;
import com.driverapp.feedbackservice.dto.request.CreateFeedbackRequest;
import com.driverapp.feedbackservice.dto.response.TripFeedbackCommentResponse;
import com.driverapp.feedbackservice.dto.response.UserInfoResponse;
import com.driverapp.feedbackservice.models.UserFeedback;
import com.driverapp.feedbackservice.repository.UserFeedbackRepository;
import com.driverapp.feedbackservice.service.FeedbackService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackServiceImpl implements FeedbackService {

    private final UserFeedbackRepository userFeedbackRepository;
    private final com.driverapp.feedbackservice.publisher.FeedbackEventPublisher feedbackEventPublisher;
    private final UserServiceClient userServiceClient;

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

        UserFeedback saved = userFeedbackRepository.save(feedback);

        feedbackEventPublisher.publishFeedbackSubmitted(
                saved.getId() != null ? saved.getId().toString() : UUID.randomUUID().toString(),
                request.getDriverId() != null ? request.getDriverId().toString() : null,
                customerUserId.toString(),
                request.getRating(),
                request.getComment()
        );

        log.info("Khách hàng {} đã đánh giá tài xế {} cho chuyến đi {}: rating={}",
                customerUserId, request.getDriverId(), request.getTripId(), request.getRating());

        return Map.of("message", "Đánh giá tài xế thành công");
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TripFeedbackCommentResponse> getDriverTripFeedbacks(
            UUID driverId, String tripId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<UserFeedback> feedbackPage;

        if (tripId != null && !tripId.isBlank()) {
            feedbackPage = userFeedbackRepository.findByDriverIdAndTripId(driverId, tripId, pageable);
        } else {
            feedbackPage = userFeedbackRepository.findByDriverId(driverId, pageable);
        }

        List<TripFeedbackCommentResponse> responseList = feedbackPage.getContent().stream().map(fb -> {
            String reviewerName = "Khách hàng ẩn danh";
            if (fb.getUserId() != null) {
                try {
                    UserInfoResponse userInfo = userServiceClient.getUserInfo(fb.getUserId());
                    if (userInfo != null && userInfo.username() != null && !userInfo.username().isBlank()) {
                        reviewerName = userInfo.username();
                    }
                } catch (Exception e) {
                    log.warn("Không thể lấy thông tin user {}: {}", fb.getUserId(), e.getMessage());
                }
            }

            return new TripFeedbackCommentResponse(
                    reviewerName,
                    fb.getComment(),
                    fb.getCreatedAt(),
                    fb.getRating()
            );
        }).toList();

        return new PageImpl<>(responseList, pageable, feedbackPage.getTotalElements());
    }
}
