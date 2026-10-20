package com.driverapp.feedbackservice.publisher;

import com.driverapp.feedbackservice.config.rabbitmq.FeedbackRabbitMQConfig;
import com.driverapp.feedbackservice.event.DomainEvent;
import com.driverapp.feedbackservice.event.FeedbackSubmittedPayload;
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
}
