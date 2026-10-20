package com.driverapp.driverservice.listener;

import com.driverapp.driverservice.event.DomainEvent;
import com.driverapp.driverservice.event.FeedbackSubmittedPayload;
import com.driverapp.driverservice.models.ProcessedEvent;
import com.driverapp.driverservice.repository.DriverRepository;
import com.driverapp.driverservice.repository.ProcessedEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class FeedbackRatingUpdateListener {

    private final DriverRepository driverRepository;
    private final ProcessedEventRepository processedEventRepository;

    @RabbitListener(queues = "feedback.rating-update.queue")
    @Transactional
    public void handleFeedbackSubmitted(DomainEvent<FeedbackSubmittedPayload> event) {
        if (processedEventRepository.existsById(event.getEventId())) {
            log.info("[Feedback] Bỏ qua event đã xử lý: {}", event.getEventId());
            return;
        }

        FeedbackSubmittedPayload payload = event.getPayload();
        if (payload.getDriverId() == null || payload.getRating() == null) {
            return;
        }

        try {
            UUID driverUserId = UUID.fromString(payload.getDriverId());
            driverRepository.updateAverageRating(driverUserId, payload.getRating().doubleValue());
            log.info("[Feedback] Cập nhật rating thành công cho driverId={}: rating={}", driverUserId, payload.getRating());
        } catch (Exception e) {
            log.error("[Feedback] Lỗi cập nhật rating cho driverId={}: {}", payload.getDriverId(), e.getMessage());
        }

        processedEventRepository.save(ProcessedEvent.builder()
                .eventId(event.getEventId())
                .eventType(event.getEventType())
                .consumerName("FeedbackRatingUpdateListener")
                .build());
    }
}
