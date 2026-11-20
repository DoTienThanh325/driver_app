package com.driverapp.driverservice.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RatingUpdatedPayload {
    private String targetId;
    private String targetType;
    private Double averageRating;
    private Long totalReviews;
}
