package com.driverapp.feedbackservice.dto.response;

import com.driverapp.feedbackservice.models.enums.ComplainationStatus;
import com.driverapp.feedbackservice.models.enums.ReportType;

import java.time.LocalDateTime;
import java.util.UUID;

public record ComplaintSummaryResponse(
        UUID id,
        ReportType reportType,
        ComplainationStatus status,
        String tripId,
        LocalDateTime createdAt
) {}
