package com.driverapp.bookingservice.dto.ai;

import lombok.Builder;

import java.util.List;
import java.util.UUID;

public record DriverScoringRequest(
        String tripId,
        double tripFare,
        int hourOfDay,
        int dayOfWeek,
        List<CandidateFeature> candidates
) {
    @Builder
    public record CandidateFeature(
            UUID driverId,
            double pickupDistanceKm,
            double pickupEtaMinutes,
            double driverRating,
            double acceptRate7d,
            int tripsCompletedToday
    ) {}
}
