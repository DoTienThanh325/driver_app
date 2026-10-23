package com.driverapp.bookingservice.publisher;

import com.driverapp.bookingservice.config.rabbitmq.BookingRabbitMQConfig;
import com.driverapp.bookingservice.event.BusinessReviewedPayload;
import com.driverapp.bookingservice.event.DomainEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BusinessEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishBusinessReviewed(BusinessReviewedPayload payload) {
        DomainEvent<BusinessReviewedPayload> event = DomainEvent.of(
                "business.reviewed",
                "bookingservice",
                payload
        );
        log.info("[Event] Publishing business reviewed event: bookingId={}, status={}",
                payload.getBookingId(), payload.getReviewStatus());

        rabbitTemplate.convertAndSend(BookingRabbitMQConfig.BUSINESS_DIRECT_EXCHANGE, "business.reviewed", event);
    }
}
