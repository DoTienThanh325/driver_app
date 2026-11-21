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
     * Đẩy message vào delay queue (TTL=25000ms).
     * Sau 25 giây RabbitMQ tự động chuyển sang matching.offer.timeout.queue qua DLX.
     */
    public void scheduleOfferTimeout(String tripId, String offerId, int rank) {
        OfferTimeoutPayload payload = OfferTimeoutPayload.builder()
                .tripId(tripId)
                .offerId(offerId)
                .rank(rank)
                .build();

        log.info("[Matching] Bắt đầu hẹn giờ 25s cho Offer {} (Trip {}, Rank {})", offerId, tripId, rank);

        sendConfirmed(MatchingRabbitMQConfig.MATCHING_DIRECT_EXCHANGE,
                MatchingRabbitMQConfig.MATCHING_OFFER_DELAY_ROUTING_KEY, payload);
    }
    public void scheduleRound(String tripId, int round) {
        sendConfirmed("matching.round.exchange", "delay",
                new com.driverapp.bookingservice.event.MatchingRoundRequest(tripId, round));
    }

    private void sendConfirmed(String exchange, String key, Object payload) {
        var correlation = new org.springframework.amqp.rabbit.connection.CorrelationData();
        rabbitTemplate.setMandatory(true);
        rabbitTemplate.convertAndSend(exchange, key, payload, correlation);
        try {
            var confirm = correlation.getFuture().get(2, java.util.concurrent.TimeUnit.SECONDS);
            if (!confirm.ack() || correlation.getReturned() != null)
                throw new IllegalStateException("Matching message was not routed durably");
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Matching publish interrupted", interrupted);
        } catch (java.util.concurrent.ExecutionException | java.util.concurrent.TimeoutException failure) {
            throw new IllegalStateException("Matching publish was not confirmed", failure);
        }
    }
}
