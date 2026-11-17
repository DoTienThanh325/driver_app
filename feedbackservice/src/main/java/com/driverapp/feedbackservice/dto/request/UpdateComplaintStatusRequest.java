package com.driverapp.feedbackservice.dto.request;

import com.driverapp.feedbackservice.models.enums.ComplainationStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateComplaintStatusRequest(
        @NotNull(message = "status không được để trống")
        ComplainationStatus status,

        String adminNote
) {}
