package com.driverapp.driverservice.event;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackSubmittedPayload {
    private String feedbackId;
    private String driverId;
    private String customerId;
    private Integer rating;
    private String comment;
}
