package com.driverapp.feedbackservice.repository;

import com.driverapp.feedbackservice.models.RestaurantFeedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RestaurantFeedbackRepository extends JpaRepository<RestaurantFeedback, UUID> {
    List<RestaurantFeedback> findByRestaurantId(String restaurantId);
    Page<RestaurantFeedback> findByRestaurantId(String restaurantId, Pageable pageable);
    Optional<RestaurantFeedback> findByUserIdAndOrderIdAndRestaurantId(UUID userId, String orderId, String restaurantId);
    boolean existsByUserIdAndOrderIdAndRestaurantId(UUID userId, String orderId, String restaurantId);

    @Query("SELECT AVG(f.rating) FROM RestaurantFeedback f WHERE f.restaurantId = :restaurantId")
    Double calculateAverageRatingByRestaurantId(@Param("restaurantId") String restaurantId);

    @Query("SELECT COUNT(f) FROM RestaurantFeedback f WHERE f.restaurantId = :restaurantId")
    Long countByRestaurantId(@Param("restaurantId") String restaurantId);
}
