package com.driverapp.bookingservice.listener;

import com.driverapp.bookingservice.config.rabbitmq.BookingFeedbackRabbitMQConfig;
import com.driverapp.bookingservice.event.DomainEvent;
import com.driverapp.bookingservice.event.RatingUpdatedPayload;
import com.driverapp.bookingservice.models.Food;
import com.driverapp.bookingservice.models.Restaurant;
import com.driverapp.bookingservice.repository.FoodRepository;
import com.driverapp.bookingservice.repository.RestaurantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class BookingRatingUpdateListener {

    private final RestaurantRepository restaurantRepository;
    private final FoodRepository foodRepository;

    @RabbitListener(queues = BookingFeedbackRabbitMQConfig.RESTAURANT_RATING_QUEUE)
    public void handleRestaurantRatingUpdated(DomainEvent<RatingUpdatedPayload> event) {
        RatingUpdatedPayload payload = event.getPayload();
        if (payload == null || payload.getTargetId() == null || payload.getAverageRating() == null) {
            log.warn("[Feedback] Bỏ qua event cập nhật rating nhà hàng không hợp lệ: eventId={}", event.getEventId());
            return;
        }

        String restaurantId = payload.getTargetId();
        restaurantRepository.findById(restaurantId).ifPresentOrElse(restaurant -> {
            restaurant.setRating(payload.getAverageRating());
            restaurant.setUpdatedAt(LocalDateTime.now());
            restaurantRepository.save(restaurant);
            log.info("[Feedback] Đã cập nhật rating nhà hàng id={}: rating={}, totalReviews={}",
                    restaurantId, payload.getAverageRating(), payload.getTotalReviews());
        }, () -> {
            log.warn("[Feedback] Không tìm thấy nhà hàng id={} để cập nhật rating", restaurantId);
        });
    }

    @RabbitListener(queues = BookingFeedbackRabbitMQConfig.FOOD_RATING_QUEUE)
    public void handleFoodRatingUpdated(DomainEvent<RatingUpdatedPayload> event) {
        RatingUpdatedPayload payload = event.getPayload();
        if (payload == null || payload.getTargetId() == null || payload.getAverageRating() == null) {
            log.warn("[Feedback] Bỏ qua event cập nhật rating món ăn không hợp lệ: eventId={}", event.getEventId());
            return;
        }

        String foodId = payload.getTargetId();
        foodRepository.findById(foodId).ifPresentOrElse(food -> {
            food.setAverageRating(payload.getAverageRating());
            if (payload.getTotalReviews() != null) {
                food.setTotalReviews(payload.getTotalReviews().intValue());
            }
            food.setUpdatedAt(LocalDateTime.now());
            foodRepository.save(food);
            log.info("[Feedback] Đã cập nhật rating món ăn id={}: averageRating={}, totalReviews={}",
                    foodId, payload.getAverageRating(), payload.getTotalReviews());
        }, () -> {
            log.warn("[Feedback] Không tìm thấy món ăn id={} để cập nhật rating", foodId);
        });
    }
}
