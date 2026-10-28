package com.driverapp.bookingservice.dto.ai;

import java.util.List;
import java.util.UUID;

public record DriverScoringResponse(
        String tripId,
        List<ScoredCandidate> rankedCandidates
) {
    public record ScoredCandidate(
            UUID driverId,
            double acceptanceProbability,
            double matchingScore,
            int rank
    ) {}
}
