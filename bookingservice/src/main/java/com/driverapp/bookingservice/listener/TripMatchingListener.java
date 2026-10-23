package com.driverapp.bookingservice.listener;

import com.driverapp.bookingservice.config.rabbitmq.MatchingRabbitMQConfig;
import com.driverapp.bookingservice.event.DomainEvent;
import com.driverapp.bookingservice.event.TripEventPayload;
import com.driverapp.bookingservice.service.MatchingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class TripMatchingListener {

    private final MatchingService matchingService;

    @RabbitListener(queues = MatchingRabbitMQConfig.TRIP_MATCHING_QUEUE)
    public void onTripCreated(DomainEvent<TripEventPayload> event) {
        log.info("[RabbitMQ] Tiếp nhận trip.created cho TripId={}", event.getPayload().getTripId());
        try {
            matchingService.handleTripCreated(event.getPayload());
        } catch (Exception e) {
            log.error("[RabbitMQ] Lỗi xử lý matching cho TripId={}: {}",
                    event.getPayload().getTripId(), e.getMessage(), e);
        }
    }
}
