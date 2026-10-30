package com.driverapp.bookingservice.service;

import com.driverapp.bookingservice.event.OfferTimeoutPayload;
import com.driverapp.bookingservice.event.TripEventPayload;

public interface MatchingService {

    void handleTripCreated(TripEventPayload payload);

    void handleOfferTimeout(OfferTimeoutPayload payload);

    void rejectOffer(String offerId);

    java.util.List<com.driverapp.bookingservice.dto.response.DriverOfferResponse> getPendingOffersForDriver(java.util.UUID driverId);
}
