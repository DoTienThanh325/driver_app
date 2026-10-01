package com.driverapp.bookingservice.repository;

import com.driverapp.bookingservice.models.MatchingOffer;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MatchingOfferRepository
        extends MongoRepository<MatchingOffer, String> {
}