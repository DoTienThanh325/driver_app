package com.driverapp.bookingservice.listener.saga;

import com.driverapp.bookingservice.event.DriverAvailabilityFailedPayload;
import com.driverapp.bookingservice.models.SagaCompensationLog;
import com.driverapp.bookingservice.models.Trip;
import com.driverapp.bookingservice.models.enums.TripStatus;
import com.driverapp.bookingservice.repository.SagaCompensationLogRepository;
import com.driverapp.bookingservice.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class DriverAvailabilityRollbackListener {

    private final TripRepository tripRepository;
    private final SagaCompensationLogRepository sagaLogRepository;

    @RabbitListener(queues = "driver.availability-update.failed.queue")
    public void handleDriverAvailabilityFailed(DriverAvailabilityFailedPayload payload) {
        log.warn("[SAGA #3] Nhận compensating event: tripId={}, driverId={}. Tiến hành rollback...",
                payload.getTripId(), payload.getDriverId());

        tripRepository.findById(payload.getTripId()).ifPresentOrElse(trip -> {
            String beforeState = trip.getStatus() != null ? trip.getStatus().name() : "UNKNOWN";

            if (trip.getStatus() == TripStatus.DRIVER_ASSIGNED) {
                trip.setStatus(TripStatus.SEARCHING_DRIVER);
                trip.setDriverId(null);
                trip.setUpdatedAt(LocalDateTime.now());
                tripRepository.save(trip);

                log.info("[SAGA #3] Rollback trip={} về SEARCHING_DRIVER thành công.", payload.getTripId());

                sagaLogRepository.save(SagaCompensationLog.builder()
                        .sagaId("TRIP-" + payload.getTripId() + "-DRIVER_AVAILABILITY")
                        .sagaType("DRIVER_AVAILABILITY_ROLLBACK")
                        .entityId(payload.getTripId())
                        .beforeState(beforeState)
                        .afterState("SEARCHING_DRIVER")
                        .triggerEvent("driver.availability.failed")
                        .result("SUCCESS")
                        .notes("Rollback do DriverService không thể cập nhật ON_TRIP. Giải phóng tài xế " + payload.getDriverId())
                        .build());
            } else {
                log.info("[SAGA #3] Bỏ qua rollback: trip={} đang ở trạng thái {}", payload.getTripId(), beforeState);
                sagaLogRepository.save(SagaCompensationLog.builder()
                        .sagaId("TRIP-" + payload.getTripId() + "-DRIVER_AVAILABILITY")
                        .sagaType("DRIVER_AVAILABILITY_ROLLBACK")
                        .entityId(payload.getTripId())
                        .beforeState(beforeState)
                        .afterState(beforeState)
                        .triggerEvent("driver.availability.failed")
                        .result("SKIPPED")
                        .notes("Trip không ở DRIVER_ASSIGNED, không rollback.")
                        .build());
            }
        }, () -> {
            log.error("[SAGA #3] Không tìm thấy tripId={} để rollback!", payload.getTripId());
            sagaLogRepository.save(SagaCompensationLog.builder()
                    .sagaId("TRIP-" + payload.getTripId() + "-DRIVER_AVAILABILITY")
                    .sagaType("DRIVER_AVAILABILITY_ROLLBACK")
                    .entityId(payload.getTripId())
                    .triggerEvent("driver.availability.failed")
                    .result("FAILED")
                    .notes("Trip không tồn tại trong DB.")
                    .build());
        });
    }
}
