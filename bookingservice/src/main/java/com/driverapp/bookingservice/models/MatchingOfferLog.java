package com.driverapp.bookingservice.models;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Lưu trữ vector đặc trưng (Feature Vector) và nhãn (Target Label) của từng lượt phát cuốc.
 * Phục vụ huấn luyện mô hình Machine Learning Phase 3.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "matching_offer_logs")
public class MatchingOfferLog {

    @Id
    private String id;

    private String tripId;
    private String offerId;
    private UUID driverId;

    // Feature set
    private double tripFare;
    private double pickupDistanceKm;
    private double pickupEtaMinutes;
    private double driverRating;
    private double acceptRate7d;
    private int tripsCompletedToday;
    private int hourOfDay;
    private int dayOfWeek;

    // Target label: 1 = ACCEPTED, 0 = EXPIRED/REJECTED, null = PENDING
    private Integer isAccepted;

    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
}
