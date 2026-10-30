package com.driverapp.bookingservice.listener;

import com.driverapp.bookingservice.config.rabbitmq.MatchingRabbitMQConfig;
import com.driverapp.bookingservice.event.OfferTimeoutPayload;
import com.driverapp.bookingservice.service.MatchingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OfferTimeoutListener {

    private final MatchingService matchingService;

    @RabbitListener(queues = MatchingRabbitMQConfig.MATCHING_OFFER_TIMEOUT_QUEUE)
    public void onOfferTimeout(OfferTimeoutPayload payload) {
        log.info("[RabbitMQ DLX] Timeout 12s kích hoạt cho OfferId={}, TripId={}",
                payload.getOfferId(), payload.getTripId());
        try {
            matchingService.handleOfferTimeout(payload);
        } catch (Exception e) {
            log.error("[RabbitMQ DLX] Lỗi xử lý timeout cho OfferId={}: {}", payload.getOfferId(), e.getMessage(), e);
        }
    }
}
