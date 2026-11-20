package com.driverapp.feedbackservice.service.impl;

import com.driverapp.feedbackservice.client.UserServiceClient;
import com.driverapp.feedbackservice.dto.request.CreateFeedbackRequest;
import com.driverapp.feedbackservice.dto.request.CreateFoodFeedbackRequest;
import com.driverapp.feedbackservice.dto.request.CreateRestaurantFeedbackRequest;
import com.driverapp.feedbackservice.dto.response.TripFeedbackCommentResponse;
import com.driverapp.feedbackservice.dto.response.UserInfoResponse;
import com.driverapp.feedbackservice.models.FoodFeedback;
import com.driverapp.feedbackservice.models.RestaurantFeedback;
import com.driverapp.feedbackservice.models.UserFeedback;
import com.driverapp.feedbackservice.publisher.FeedbackEventPublisher;
import com.driverapp.feedbackservice.repository.FoodFeedbackRepository;
import com.driverapp.feedbackservice.repository.RestaurantFeedbackRepository;
import com.driverapp.feedbackservice.repository.UserFeedbackRepository;
import com.driverapp.feedbackservice.service.FeedbackService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackServiceImpl implements FeedbackService {

    private final UserFeedbackRepository userFeedbackRepository;
    private final RestaurantFeedbackRepository restaurantFeedbackRepository;
    private final FoodFeedbackRepository foodFeedbackRepository;
    private final FeedbackEventPublisher feedbackEventPublisher;
    private final UserServiceClient userServiceClient;

    @Override
    @Transactional
    public Map<String, Object> createDriverFeedback(CreateFeedbackRequest request, Jwt jwt) {
        UUID customerUserId = UUID.fromString(jwt.getSubject());

        // Kiểm tra quy tắc 1 lần duy nhất
        if (userFeedbackRepository.existsByUserIdAndTripId(customerUserId, request.getTripId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bạn đã đánh giá chuyến đi này rồi");
        }

        UserFeedback feedback = UserFeedback.builder()
                .userId(customerUserId)
                .driverId(request.getDriverId())
                .tripId(request.getTripId())
                .rating(request.getRating())
                .tags(request.getTags())
                .comment(request.getComment())
                .build();

        UserFeedback saved = userFeedbackRepository.save(feedback);

        // Tính điểm trung bình và tổng số review chuẩn xác từ DB
        Double rawAvg = userFeedbackRepository.calculateAverageRatingByDriverId(request.getDriverId());
        Long count = userFeedbackRepository.countByDriverId(request.getDriverId());
        double avg = (rawAvg != null) ? Math.round(rawAvg * 10.0) / 10.0 : request.getRating();
        long totalReviews = (count != null) ? count : 1L;

        // Bắn sự kiện cập nhật điểm qua RabbitMQ cho DriverService
        feedbackEventPublisher.publishDriverRatingUpdated(request.getDriverId().toString(), avg, totalReviews);

        // Duy trì event cũ cho tương thích
        feedbackEventPublisher.publishFeedbackSubmitted(
                saved.getId() != null ? saved.getId().toString() : UUID.randomUUID().toString(),
                request.getDriverId() != null ? request.getDriverId().toString() : null,
                customerUserId.toString(),
                request.getRating(),
                request.getComment()
        );

        log.info("Khách hàng {} đã đánh giá tài xế {}: rating={}, newAvg={}, total={}",
                customerUserId, request.getDriverId(), request.getRating(), avg, totalReviews);

        return Map.of(
                "message", "Đánh giá tài xế thành công",
                "averageRating", avg,
                "totalReviews", totalReviews
        );
    }

    @Override
    @Transactional
    public Map<String, Object> createRestaurantFeedback(CreateRestaurantFeedbackRequest request, Jwt jwt) {
        UUID customerUserId = UUID.fromString(jwt.getSubject());

        if (restaurantFeedbackRepository.existsByUserIdAndOrderIdAndRestaurantId(customerUserId, request.getOrderId(), request.getRestaurantId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bạn đã đánh giá nhà hàng cho đơn hàng này rồi");
        }

        RestaurantFeedback feedback = RestaurantFeedback.builder()
                .userId(customerUserId)
                .restaurantId(request.getRestaurantId())
                .orderId(request.getOrderId())
                .rating(request.getRating())
                .tags(request.getTags())
                .comment(request.getComment())
                .build();

        restaurantFeedbackRepository.save(feedback);

        Double rawAvg = restaurantFeedbackRepository.calculateAverageRatingByRestaurantId(request.getRestaurantId());
        Long count = restaurantFeedbackRepository.countByRestaurantId(request.getRestaurantId());
        double avg = (rawAvg != null) ? Math.round(rawAvg * 10.0) / 10.0 : request.getRating();
        long totalReviews = (count != null) ? count : 1L;

        feedbackEventPublisher.publishRestaurantRatingUpdated(request.getRestaurantId(), avg, totalReviews);

        log.info("Khách hàng {} đã đánh giá nhà hàng {}: rating={}, newAvg={}, total={}",
                customerUserId, request.getRestaurantId(), request.getRating(), avg, totalReviews);

        return Map.of(
                "message", "Đánh giá nhà hàng thành công",
                "averageRating", avg,
                "totalReviews", totalReviews
        );
    }

    @Override
    @Transactional
    public Map<String, Object> createFoodFeedback(CreateFoodFeedbackRequest request, Jwt jwt) {
        UUID customerUserId = UUID.fromString(jwt.getSubject());

        if (foodFeedbackRepository.existsByUserIdAndOrderIdAndFoodId(customerUserId, request.getOrderId(), request.getFoodId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bạn đã đánh giá món ăn này cho đơn hàng rồi");
        }

        FoodFeedback feedback = FoodFeedback.builder()
                .userId(customerUserId)
                .foodId(request.getFoodId())
                .orderId(request.getOrderId())
                .rating(request.getRating())
                .tags(request.getTags())
                .comment(request.getComment())
                .build();

        foodFeedbackRepository.save(feedback);

        Double rawAvg = foodFeedbackRepository.calculateAverageRatingByFoodId(request.getFoodId());
        Long count = foodFeedbackRepository.countByFoodId(request.getFoodId());
        double avg = (rawAvg != null) ? Math.round(rawAvg * 10.0) / 10.0 : request.getRating();
        long totalReviews = (count != null) ? count : 1L;

        feedbackEventPublisher.publishFoodRatingUpdated(request.getFoodId(), avg, totalReviews);

        log.info("Khách hàng {} đã đánh giá món ăn {}: rating={}, newAvg={}, total={}",
                customerUserId, request.getFoodId(), request.getRating(), avg, totalReviews);

        return Map.of(
                "message", "Đánh giá món ăn thành công",
                "averageRating", avg,
                "totalReviews", totalReviews
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getTripFeedbackStatus(String tripId, Jwt jwt) {
        UUID customerUserId = UUID.fromString(jwt.getSubject());
        Optional<UserFeedback> feedbackOpt = userFeedbackRepository.findByUserIdAndTripId(customerUserId, tripId);
        if (feedbackOpt.isPresent()) {
            UserFeedback fb = feedbackOpt.get();
            return Map.of(
                    "isRated", true,
                    "rating", fb.getRating(),
                    "tags", fb.getTags() != null ? fb.getTags() : "",
                    "comment", fb.getComment() != null ? fb.getComment() : "",
                    "createdAt", fb.getCreatedAt().toString()
            );
        }
        return Map.of("isRated", false);
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
