package com.driverapp.bookingservice.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class RatingUpdatedPayload {
    private String targetId;
    private String targetType;
    private Double averageRating;
    private Long totalReviews;
}
