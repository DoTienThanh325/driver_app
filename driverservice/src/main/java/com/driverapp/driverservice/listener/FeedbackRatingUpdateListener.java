package com.driverapp.driverservice.listener;

import com.driverapp.driverservice.event.DomainEvent;
import com.driverapp.driverservice.event.RatingUpdatedPayload;
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
    public void handleDriverRatingUpdated(DomainEvent<RatingUpdatedPayload> event) {
        if (processedEventRepository.existsById(event.getEventId())) {
            log.info("[Feedback] Bỏ qua event đã xử lý: {}", event.getEventId());
            return;
        }

        RatingUpdatedPayload payload = event.getPayload();
        if (payload == null || payload.getTargetId() == null || payload.getAverageRating() == null) {
            return;
        }

        try {
            UUID driverUserId = UUID.fromString(payload.getTargetId());
            driverRepository.updateAverageRating(driverUserId, payload.getAverageRating());
            log.info("[Feedback] Cập nhật average rating thành công cho driverId={}: averageRating={}, totalReviews={}",
                    driverUserId, payload.getAverageRating(), payload.getTotalReviews());
        } catch (Exception e) {
            log.error("[Feedback] Lỗi cập nhật rating cho driverId={}: {}", payload.getTargetId(), e.getMessage());
        }

        processedEventRepository.save(ProcessedEvent.builder()
                .eventId(event.getEventId())
                .eventType(event.getEventType())
                .consumerName("FeedbackRatingUpdateListener")
                .build());
    }
}
