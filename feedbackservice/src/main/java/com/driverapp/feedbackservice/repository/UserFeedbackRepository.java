package com.driverapp.feedbackservice.repository;

import com.driverapp.feedbackservice.models.UserFeedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public interface UserFeedbackRepository extends JpaRepository<UserFeedback, UUID> {
    List<UserFeedback> findByDriverId(UUID driverId);
    List<UserFeedback> findByTripId(String tripId);
    Optional<UserFeedback> findByUserIdAndTripId(UUID userId, String tripId);
    boolean existsByUserIdAndTripId(UUID userId, String tripId);
    Page<UserFeedback> findByDriverId(UUID driverId, Pageable pageable);
    Page<UserFeedback> findByDriverIdAndTripId(UUID driverId, String tripId, Pageable pageable);

    @Query("SELECT AVG(f.rating) FROM UserFeedback f WHERE f.driverId = :driverId")
    Double calculateAverageRatingByDriverId(@Param("driverId") UUID driverId);

    @Query("SELECT COUNT(f) FROM UserFeedback f WHERE f.driverId = :driverId")
    Long countByDriverId(@Param("driverId") UUID driverId);
}

