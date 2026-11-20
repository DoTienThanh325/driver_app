package com.driverapp.feedbackservice.repository;

import com.driverapp.feedbackservice.models.FoodFeedback;
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
public interface FoodFeedbackRepository extends JpaRepository<FoodFeedback, UUID> {
    List<FoodFeedback> findByFoodId(String foodId);
    Page<FoodFeedback> findByFoodId(String foodId, Pageable pageable);
    Optional<FoodFeedback> findByUserIdAndOrderIdAndFoodId(UUID userId, String orderId, String foodId);
    boolean existsByUserIdAndOrderIdAndFoodId(UUID userId, String orderId, String foodId);

    @Query("SELECT AVG(f.rating) FROM FoodFeedback f WHERE f.foodId = :foodId")
    Double calculateAverageRatingByFoodId(@Param("foodId") String foodId);

    @Query("SELECT COUNT(f) FROM FoodFeedback f WHERE f.foodId = :foodId")
    Long countByFoodId(@Param("foodId") String foodId);
}
