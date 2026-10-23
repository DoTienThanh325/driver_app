package com.driverapp.bookingservice.models;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "saga_compensation_log")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SagaCompensationLog {

    @Id
    private String id;
    private String sagaId;
    private String sagaType;
    private String entityId;
    private String beforeState;
    private String afterState;
    private String triggerEvent;
    private String result; // SUCCESS, FAILED, SKIPPED, MANUAL_REQUIRED
    private String notes;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
