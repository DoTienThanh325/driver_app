package com.driverapp.userservice.event;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BusinessReviewedPayload {
    private String bookingId;
    private String businessUserId;
    private String reviewStatus;
    private String reviewerNotes;
}
