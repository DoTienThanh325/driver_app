package com.driverapp.bookingservice.event;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BusinessReviewedPayload {
    private String bookingId;
    private String businessUserId;
    private String reviewStatus; // ACCEPTED, REJECTED, BANNED
    private String reviewerNotes;
}
