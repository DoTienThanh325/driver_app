package com.driverapp.bookingservice.publisher;

import com.driverapp.bookingservice.config.rabbitmq.MatchingRabbitMQConfig;
import com.driverapp.bookingservice.event.OfferTimeoutPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MatchingEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    /**
     * Đẩy message vào delay queue (TTL=12000ms).
     * Sau 12 giây RabbitMQ tự động chuyển sang matching.offer.timeout.queue qua DLX.
     */
    public void scheduleOfferTimeout(String tripId, String offerId, int rank) {
        OfferTimeoutPayload payload = OfferTimeoutPayload.builder()
                .tripId(tripId)
                .offerId(offerId)
                .rank(rank)
                .build();

        log.info("[Matching] Bắt đầu hẹn giờ 12s cho Offer {} (Trip {}, Rank {})", offerId, tripId, rank);

        rabbitTemplate.convertAndSend(
                MatchingRabbitMQConfig.MATCHING_DIRECT_EXCHANGE,
                MatchingRabbitMQConfig.MATCHING_OFFER_DELAY_ROUTING_KEY,
                payload
        );
    }
}
