package com.driverapp.feedbackservice.publisher;

import com.driverapp.feedbackservice.config.rabbitmq.FeedbackRabbitMQConfig;
import com.driverapp.feedbackservice.event.DomainEvent;
import com.driverapp.feedbackservice.event.FeedbackSubmittedPayload;
import com.driverapp.feedbackservice.event.RatingUpdatedPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class FeedbackEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishFeedbackSubmitted(String feedbackId, String driverId, String customerId, Double rating, String comment) {
        FeedbackSubmittedPayload payload = FeedbackSubmittedPayload.builder()
                .feedbackId(feedbackId)
                .driverId(driverId)
                .customerId(customerId)
                .rating(rating)
                .comment(comment)
                .build();

        DomainEvent<FeedbackSubmittedPayload> event = DomainEvent.of(
                "feedback.submitted",
                "feedbackservice",
                payload
        );

        log.info("[Event] Publishing feedback.submitted: driverId={}, rating={}", driverId, rating);
        rabbitTemplate.convertAndSend(FeedbackRabbitMQConfig.FEEDBACK_DIRECT_EXCHANGE, "feedback.submitted", event);
    }

    public void publishDriverRatingUpdated(String driverId, Double averageRating, Long totalReviews) {
        RatingUpdatedPayload payload = RatingUpdatedPayload.builder()
                .targetId(driverId)
                .targetType("DRIVER")
                .averageRating(averageRating)
                .totalReviews(totalReviews)
                .build();

        DomainEvent<RatingUpdatedPayload> event = DomainEvent.of(
                "feedback.rating.driver",
                "feedbackservice",
                payload
        );

        log.info("[Event] Publishing feedback.rating.driver: driverId={}, avgRating={}, totalReviews={}", driverId, averageRating, totalReviews);
        rabbitTemplate.convertAndSend(FeedbackRabbitMQConfig.FEEDBACK_DIRECT_EXCHANGE, "feedback.rating.driver", event);
    }

    public void publishRestaurantRatingUpdated(String restaurantId, Double averageRating, Long totalReviews) {
        RatingUpdatedPayload payload = RatingUpdatedPayload.builder()
                .targetId(restaurantId)
                .targetType("RESTAURANT")
                .averageRating(averageRating)
                .totalReviews(totalReviews)
                .build();

        DomainEvent<RatingUpdatedPayload> event = DomainEvent.of(
                "feedback.rating.restaurant",
                "feedbackservice",
                payload
        );

        log.info("[Event] Publishing feedback.rating.restaurant: restaurantId={}, avgRating={}, totalReviews={}", restaurantId, averageRating, totalReviews);
        rabbitTemplate.convertAndSend(FeedbackRabbitMQConfig.FEEDBACK_DIRECT_EXCHANGE, "feedback.rating.restaurant", event);
    }

    public void publishFoodRatingUpdated(String foodId, Double averageRating, Long totalReviews) {
        RatingUpdatedPayload payload = RatingUpdatedPayload.builder()
                .targetId(foodId)
                .targetType("FOOD")
                .averageRating(averageRating)
                .totalReviews(totalReviews)
                .build();

        DomainEvent<RatingUpdatedPayload> event = DomainEvent.of(
                "feedback.rating.food",
                "feedbackservice",
                payload
        );

        log.info("[Event] Publishing feedback.rating.food: foodId={}, avgRating={}, totalReviews={}", foodId, averageRating, totalReviews);
        rabbitTemplate.convertAndSend(FeedbackRabbitMQConfig.FEEDBACK_DIRECT_EXCHANGE, "feedback.rating.food", event);
    }
}
