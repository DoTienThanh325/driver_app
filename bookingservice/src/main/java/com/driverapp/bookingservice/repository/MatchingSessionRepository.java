package com.driverapp.bookingservice.repository;

import com.driverapp.bookingservice.models.MatchingSession;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MatchingSessionRepository extends MongoRepository<MatchingSession, String> {
}
