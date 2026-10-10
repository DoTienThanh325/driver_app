package com.driverapp.feedbackservice.repository;

import com.driverapp.feedbackservice.models.UserFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public interface UserFeedbackRepository extends JpaRepository<UserFeedback, UUID> {
    List<UserFeedback> findByDriverId(UUID driverId);
    List<UserFeedback> findByTripId(String tripId);
}

