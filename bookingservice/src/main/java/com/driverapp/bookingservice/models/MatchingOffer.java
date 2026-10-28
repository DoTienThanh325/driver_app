package com.driverapp.bookingservice.models;

import com.driverapp.bookingservice.models.enums.MatchingOfferStatus;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "matching_offers")
public class MatchingOffer {

    @Id
    private String id;

    private UUID driverId;
    private String tripId;
    private MatchingOfferStatus status;
    private Boolean backToBack;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
