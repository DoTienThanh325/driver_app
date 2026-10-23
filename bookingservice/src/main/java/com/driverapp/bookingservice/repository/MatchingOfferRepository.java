package com.driverapp.bookingservice.repository;

import com.driverapp.bookingservice.models.MatchingOffer;
import com.driverapp.bookingservice.models.enums.MatchingOfferStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface MatchingOfferRepository extends MongoRepository<MatchingOffer, String> {

    Optional<MatchingOffer> findByTripIdAndStatus(String tripId, MatchingOfferStatus status);

    List<MatchingOffer> findByTripIdAndStatusIn(String tripId, List<MatchingOfferStatus> statuses);
}