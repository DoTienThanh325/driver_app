package com.driverapp.driverservice.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "saga_compensation_log")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SagaCompensationLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "saga_id", nullable = false)
    private String sagaId;

    @Column(name = "saga_type", nullable = false)
    private String sagaType;

    @Column(name = "entity_id", nullable = false)
    private String entityId;

    @Column(name = "before_state")
    private String beforeState;

    @Column(name = "after_state")
    private String afterState;

    @Column(name = "trigger_event", nullable = false)
    private String triggerEvent;

    @Column(name = "result", nullable = false)
    private String result;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
