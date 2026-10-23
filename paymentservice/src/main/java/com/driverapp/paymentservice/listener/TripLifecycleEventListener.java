package com.driverapp.paymentservice.listener;

import com.driverapp.paymentservice.event.DomainEvent;
import com.driverapp.paymentservice.event.TripEventPayload;
import com.driverapp.paymentservice.event.TripPaymentInitFailedPayload;
import com.driverapp.paymentservice.models.ProcessedEvent;
import com.driverapp.paymentservice.repository.ProcessedEventRepository;
import com.driverapp.paymentservice.service.TripPaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class TripLifecycleEventListener {

    private final TripPaymentService tripPaymentService;
    private final ProcessedEventRepository processedEventRepository;
    private final RabbitTemplate rabbitTemplate;

    /**
     * 1. Khi chuyến đi được tạo -> Tự động khởi tạo thanh toán mặc định PAY_DIRECTLY
     */
    @RabbitListener(queues = "trip.payment-init.queue")
    public void handleTripCreated(DomainEvent<TripEventPayload> event) {
        if (processedEventRepository.existsById(event.getEventId())) {
            log.info("[Payment] Đã xử lý event: {}", event.getEventId());
            return;
        }

        TripEventPayload payload = event.getPayload();
        log.info("[Payment] Khởi tạo thanh toán mặc định PAY_DIRECTLY cho tripId={}", payload.getTripId());

        try {
            double totalAmt = payload.getTotalAmount() != null ? payload.getTotalAmount().doubleValue() : 0.0;
            tripPaymentService.initDefaultPayDirectlyPayment(
                    payload.getTripId(),
                    UUID.fromString(payload.getCustomerId()),
                    totalAmt
            );

            processedEventRepository.save(ProcessedEvent.builder()
                    .eventId(event.getEventId())
                    .eventType(event.getEventType())
                    .consumerName("TripLifecycleEventListener-Created")
                    .build());
        } catch (Exception e) {
            log.error("[Payment] Lỗi khởi tạo thanh toán cho tripId={}, kích hoạt retry / bù trừ SAGA: {}",
                    payload.getTripId(), e.getMessage());
            throw e; // Ném ngoại lệ để RabbitMQ đưa sang DLQ
        }
    }

    /**
     * 2. SAGA Compensating Trigger: Khi khởi tạo thanh toán thất bại sau max retries (từ DLQ)
     */
    @RabbitListener(queues = "trip.payment-init.dlq")
    public void handlePaymentInitDlq(DomainEvent<TripEventPayload> event) {
        TripEventPayload payload = event.getPayload();
        log.error("[SAGA] 🚨 Khởi tạo thanh toán thất bại sau max retries cho tripId={}. Kích hoạt xóa chuyến bên BookingService!",
                payload.getTripId());

        TripPaymentInitFailedPayload failedPayload = TripPaymentInitFailedPayload.builder()
                .tripId(payload.getTripId())
                .customerId(payload.getCustomerId())
                .amount(payload.getTotalAmount())
                .reason("Lỗi không thể khởi tạo bản ghi thanh toán mặc định PAY_DIRECTLY trong PaymentService.")
                .build();

        rabbitTemplate.convertAndSend("saga.compensating.exchange", "trip.payment-init.failed", failedPayload);
    }

    /**
     * 3. Khi tài xế nhận chuyến -> Cập nhật driverId vào TripPayment (VẪN GIỮ NGUYÊN PAY_DIRECTLY)
     */
    @RabbitListener(queues = "trip.driver-assigned.queue")
    public void handleDriverAssigned(DomainEvent<TripEventPayload> event) {
        if (processedEventRepository.existsById(event.getEventId())) {
            return;
        }

        TripEventPayload payload = event.getPayload();
        log.info("[Payment] Cập nhật tài xế vào thanh toán (vẫn giữ PAY_DIRECTLY): tripId={}, driverId={}",
                payload.getTripId(), payload.getDriverId());

        if (payload.getDriverId() != null) {
            tripPaymentService.assignDriverToPayment(
                    payload.getTripId(),
                    UUID.fromString(payload.getDriverId())
            );
        }

        processedEventRepository.save(ProcessedEvent.builder()
                .eventId(event.getEventId())
                .eventType(event.getEventType())
                .consumerName("TripLifecycleEventListener-DriverAssigned")
                .build());
    }
}
