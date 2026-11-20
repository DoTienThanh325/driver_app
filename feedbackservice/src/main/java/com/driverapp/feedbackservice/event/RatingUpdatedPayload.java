package com.driverapp.feedbackservice.event;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RatingUpdatedPayload {
    private String targetId;      // driverId / restaurantId / foodId
    private String targetType;    // "DRIVER" | "RESTAURANT" | "FOOD"
    private Double averageRating; // Điểm trung bình làm tròn 1 chữ số thập phân (e.g., 4.8)
    private Long totalReviews;    // Tổng số lượt đánh giá
}
