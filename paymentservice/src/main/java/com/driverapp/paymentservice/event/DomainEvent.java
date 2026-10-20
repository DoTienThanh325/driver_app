package com.driverapp.paymentservice.event;

import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DomainEvent<T> {
    private String eventId;
    private String eventType;
    private Instant timestamp;
    private String sourceService;
    private T payload;

    public static <T> DomainEvent<T> of(String eventType, String sourceService, T payload) {
        return DomainEvent.<T>builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(eventType)
                .timestamp(Instant.now())
                .sourceService(sourceService)
                .payload(payload)
                .build();
    }
}
