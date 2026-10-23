package com.driverapp.bookingservice.listener.saga;

import com.driverapp.bookingservice.client.NotificationClient;
import com.driverapp.bookingservice.dto.request.CreateNotificationRequest;
import com.driverapp.bookingservice.event.TripPaymentInitFailedPayload;
import com.driverapp.bookingservice.models.SagaCompensationLog;
import com.driverapp.bookingservice.models.Trip;
import com.driverapp.bookingservice.repository.SagaCompensationLogRepository;
import com.driverapp.bookingservice.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class TripPaymentInitRollbackListener {

    private final TripRepository tripRepository;
    private final SagaCompensationLogRepository sagaLogRepository;
    private final NotificationClient notificationClient;

    @RabbitListener(queues = "trip.payment-init.failed.queue")
    public void handlePaymentInitFailed(TripPaymentInitFailedPayload payload) {
        log.warn("[SAGA #4] 🚨 Nhận compensating event: tripId={}, lý do={}. Báo lỗi và XÓA chuyến đi...",
                payload.getTripId(), payload.getReason());

        tripRepository.findById(payload.getTripId()).ifPresentOrElse(trip -> {
            String beforeState = trip.getStatus() != null ? trip.getStatus().name() : "UNKNOWN";

            // 1. Gửi thông báo lỗi trực tiếp tới khách hàng
            if (payload.getCustomerId() != null) {
                try {
                    notificationClient.createNotification(new CreateNotificationRequest(
                            "Không thể tạo chuyến đi",
                            "Hệ thống gặp sự cố khi khởi tạo thông tin thanh toán cho chuyến đi của bạn. Cuốc xe đã được tự động hủy, vui lòng thử lại.",
                            UUID.fromString(payload.getCustomerId())
                    ));
                    log.info("[SAGA #4] Đã gửi thông báo lỗi đến khách hàng customerId={}", payload.getCustomerId());
                } catch (Exception e) {
                    log.warn("[SAGA #4] Lỗi khi gửi thông báo cho khách hàng customerId={}: {}", payload.getCustomerId(), e.getMessage());
                }
            }

            // 2. XÓA HOÀN TOÀN chuyến đi khỏi MongoDB (Hard Delete)
            tripRepository.delete(trip);
            log.info("[SAGA #4] ✅ Đã XÓA HOÀN TOÀN chuyến đi tripId={} khỏi Database.", payload.getTripId());

            // 3. Ghi vết kiểm toán vào Saga Compensation Log
            sagaLogRepository.save(SagaCompensationLog.builder()
                    .sagaId("TRIP-" + payload.getTripId() + "-PAYMENT_INIT")
                    .sagaType("TRIP_PAYMENT_INIT_ROLLBACK")
                    .entityId(payload.getTripId())
                    .beforeState(beforeState)
                    .afterState("DELETED")
                    .triggerEvent("trip.payment-init.failed")
                    .result("SUCCESS")
                    .notes(String.format("Đã gửi thông báo lỗi và xóa chuyến đi do không thể khởi tạo thanh toán: %s", payload.getReason()))
                    .build());

        }, () -> {
            log.warn("[SAGA #4] Không tìm thấy tripId={} (có thể đã bị xóa trước đó)", payload.getTripId());
            sagaLogRepository.save(SagaCompensationLog.builder()
                    .sagaId("TRIP-" + payload.getTripId() + "-PAYMENT_INIT")
                    .sagaType("TRIP_PAYMENT_INIT_ROLLBACK")
                    .entityId(payload.getTripId())
                    .beforeState("NOT_FOUND")
                    .afterState("NOT_FOUND")
                    .triggerEvent("trip.payment-init.failed")
                    .result("SKIPPED")
                    .notes("Trip không tồn tại trong DB, bỏ qua thao tác xóa.")
                    .build());
        });
    }
}
