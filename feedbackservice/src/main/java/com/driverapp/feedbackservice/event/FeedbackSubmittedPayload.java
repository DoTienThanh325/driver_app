package com.driverapp.feedbackservice.event;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackSubmittedPayload {
    private String feedbackId;
    private String driverId;
    private String customerId;
    private Double rating;
    private String comment;
}
