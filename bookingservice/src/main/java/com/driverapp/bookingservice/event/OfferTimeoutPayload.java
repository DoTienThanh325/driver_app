package com.driverapp.bookingservice.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfferTimeoutPayload implements Serializable {
    private String tripId;
    private String offerId;
    private int rank;
}
