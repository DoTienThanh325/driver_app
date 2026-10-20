package com.driverapp.paymentservice.listener;

import com.driverapp.paymentservice.event.DomainEvent;
import com.driverapp.paymentservice.event.PaymentCompleteFailedPayload;
import com.driverapp.paymentservice.event.TripEventPayload;
import com.driverapp.paymentservice.models.ProcessedEvent;
import com.driverapp.paymentservice.repository.ProcessedEventRepository;
import com.driverapp.paymentservice.service.TripPaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class TripCompletedEventListener {

    private final TripPaymentService tripPaymentService;
    private final ProcessedEventRepository processedEventRepository;
    private final RabbitTemplate rabbitTemplate;

    @RabbitListener(queues = "trip.payment-complete.queue")
    public void handleTripCompleted(DomainEvent<TripEventPayload> event) {
        if (processedEventRepository.existsById(event.getEventId())) {
            log.info("[Payment] Bỏ qua event đã xử lý: {}", event.getEventId());
            return;
        }

        TripEventPayload payload = event.getPayload();
        if ("PAY_DIRECTLY".equalsIgnoreCase(payload.getPaymentMethod())
                || "PAY_AFTER".equalsIgnoreCase(payload.getPaymentMethod())) {
            log.info("[Payment] Chốt thanh toán PAY_DIRECTLY cho tripId={}, số tiền={}",
                    payload.getTripId(), payload.getTotalAmount());
            tripPaymentService.completePayDirectlyTripPayment(payload.getTripId());
        }

        processedEventRepository.save(ProcessedEvent.builder()
                .eventId(event.getEventId())
                .eventType(event.getEventType())
                .consumerName("TripCompletedEventListener")
                .build());
    }

    /**
     * SAGA Compensating Trigger: Khi chốt tiền lỗi sau 3 retry, phát event sang BookingService
     */
    @RabbitListener(queues = "trip.payment-complete.dlq")
    public void handlePaymentFailureDlq(DomainEvent<TripEventPayload> event) {
        TripEventPayload payload = event.getPayload();
        if (!"PAY_DIRECTLY".equalsIgnoreCase(payload.getPaymentMethod())
                && !"PAY_AFTER".equalsIgnoreCase(payload.getPaymentMethod())) {
            return;
        }

        log.error("[SAGA #2] Chốt thanh toán PAY_DIRECTLY thất bại sau maxRetry cho tripId={}. Phát event cảnh báo!",
                payload.getTripId());

        PaymentCompleteFailedPayload failedPayload = PaymentCompleteFailedPayload.builder()
                .tripId(payload.getTripId())
                .customerId(payload.getCustomerId())
                .amount(payload.getTotalAmount())
                .paymentMethod("PAY_DIRECTLY")
                .reason("Không thể tự động chốt thanh toán PAY_DIRECTLY sau 3 lần retry.")
                .build();

        rabbitTemplate.convertAndSend("saga.compensating.exchange", "payment.complete.failed", failedPayload);
    }
}
