package com.driverapp.bookingservice.publisher;

import com.driverapp.bookingservice.config.rabbitmq.BookingRabbitMQConfig;
import com.driverapp.bookingservice.event.DomainEvent;
import com.driverapp.bookingservice.event.TripEventPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class TripEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishTripEvent(String routingKey, TripEventPayload payload) {
        DomainEvent<TripEventPayload> event = DomainEvent.of(
                routingKey,
                "bookingservice",
                payload
        );
        log.info("[Event] Publishing trip event: routingKey={}, tripId={}, eventId={}",
                routingKey, payload.getTripId(), event.getEventId());

        rabbitTemplate.convertAndSend(BookingRabbitMQConfig.TRIP_TOPIC_EXCHANGE, routingKey, event);
    }

    public void publishTripCreated(TripEventPayload payload) {
        publishTripEvent("trip.created", payload);
    }

    public void publishDriverAssigned(TripEventPayload payload) {
        publishTripEvent("trip.driver-assigned", payload);
    }

    public void publishTripCompleted(TripEventPayload payload) {
        publishTripEvent("trip.completed", payload);
    }

    public void publishTripCancelled(TripEventPayload payload) {
        publishTripEvent("trip.cancelled", payload);
    }
}
