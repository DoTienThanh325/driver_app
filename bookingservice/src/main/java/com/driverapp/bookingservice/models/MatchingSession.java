package com.driverapp.bookingservice.models;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "matching_sessions")
public class MatchingSession {

    @Id
    private String tripId;

    private int currentRank;
    private String currentOfferId;
    private List<CandidateDriver> candidates;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CandidateDriver {
        private UUID driverId;
        private double etaMinutes;
        private double distanceKm;
        private int rank;
    }
}
