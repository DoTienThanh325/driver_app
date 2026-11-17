package com.driverapp.feedbackservice.dto.response;

import com.driverapp.feedbackservice.models.enums.ComplainationStatus;
import com.driverapp.feedbackservice.models.enums.ReportType;

import java.time.LocalDateTime;
import java.util.UUID;

public record ComplaintDetailResponse(
        UUID id,
        String tripId,
        ReportType reportType,
        ComplainationStatus status,
        ParticipantInfo customer,
        ParticipantInfo driver,
        String adminNote,
        UUID resolvedBy,
        LocalDateTime resolvedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public record ParticipantInfo(
            UUID id,
            String username,
            String phoneNumber
    ) {}
}
