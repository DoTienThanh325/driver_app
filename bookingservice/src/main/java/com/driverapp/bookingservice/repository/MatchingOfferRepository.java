package com.driverapp.bookingservice.repository;

import com.driverapp.bookingservice.models.MatchingOffer;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MatchingOfferRepository
        extends MongoRepository<MatchingOffer, UUID> {
}