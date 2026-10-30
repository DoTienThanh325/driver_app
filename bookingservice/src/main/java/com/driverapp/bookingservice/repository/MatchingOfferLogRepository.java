package com.driverapp.bookingservice.repository;

import com.driverapp.bookingservice.models.MatchingOfferLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MatchingOfferLogRepository extends MongoRepository<MatchingOfferLog, String> {

    Optional<MatchingOfferLog> findByOfferId(String offerId);

    List<MatchingOfferLog> findByTripId(String tripId);
}
