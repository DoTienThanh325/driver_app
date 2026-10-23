package com.driverapp.bookingservice.listener.saga;

import com.driverapp.bookingservice.event.PaymentCompleteFailedPayload;
import com.driverapp.bookingservice.models.SagaCompensationLog;
import com.driverapp.bookingservice.repository.SagaCompensationLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentInconsistencyListener {

    private final SagaCompensationLogRepository sagaLogRepository;

    @RabbitListener(queues = "payment.complete.failed.queue")
    public void handlePaymentCompleteFailed(PaymentCompleteFailedPayload payload) {
        log.error("[SAGA #2] 🚨 MÂU THUẪN DỮ LIỆU: Trip {} đã COMPLETED nhưng thanh toán PAY_AFTER (Số tiền: {}) không thể tự chốt!",
                payload.getTripId(), payload.getAmount());

        sagaLogRepository.save(SagaCompensationLog.builder()
                .sagaId("TRIP-" + payload.getTripId() + "-PAYMENT")
                .sagaType("PAYMENT_INCONSISTENCY")
                .entityId(payload.getTripId())
                .beforeState("COMPLETED")
                .afterState("COMPLETED") // Giữ nguyên trạng thái chuyến vì dịch vụ đã hoàn thành thực tế
                .triggerEvent("payment.complete.failed")
                .result("MANUAL_REQUIRED")
                .notes(String.format("Lỗi: %s. Khách: %s. Admin cần re-drive DLQ hoặc xác nhận thanh toán thủ công.",
                        payload.getReason(), payload.getCustomerId()))
                .build());
    }
}
