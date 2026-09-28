package com.driverapp.bookingservice.models;

import com.driverapp.bookingservice.models.enums.MatchingOfferStatus;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@NoArgsConstructor
@Document(collection = "matching_offers")
public class MatchingOffer {
    @Id
    private UUID id;

    private UUID driverId;
    private UUID tripId;
    private MatchingOfferStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}