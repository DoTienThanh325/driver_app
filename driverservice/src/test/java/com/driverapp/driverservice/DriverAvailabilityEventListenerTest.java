package com.driverapp.driverservice;

import com.driverapp.driverservice.event.DomainEvent;
import com.driverapp.driverservice.event.DriverAvailabilityFailedPayload;
import com.driverapp.driverservice.event.TripEventPayload;
import com.driverapp.driverservice.listener.DriverAvailabilityEventListener;
import com.driverapp.driverservice.models.DriverAvailability;
import com.driverapp.driverservice.models.ProcessedEvent;
import com.driverapp.driverservice.models.enums.AvailabilityStatus;
import com.driverapp.driverservice.repository.DriverAvailabilityRepository;
import com.driverapp.driverservice.repository.ProcessedEventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DriverAvailabilityEventListenerTest {

    @Mock
    private DriverAvailabilityRepository availabilityRepository;

    @Mock
    private ProcessedEventRepository processedEventRepository;

    @Mock
    private RabbitTemplate rabbitTemplate;

    @InjectMocks
    private DriverAvailabilityEventListener listener;

    @Test
    void handleTripStatusChanged_ignoresEventsWithoutTripStatus() {
        UUID driverId = UUID.randomUUID();
        DomainEvent<TripEventPayload> event = DomainEvent.<TripEventPayload>builder()
                .eventId("evt-offer-1")
                .eventType("trip.offer-updated")
                .payload(TripEventPayload.builder()
                        .tripId("trip-1")
                        .driverId(driverId.toString())
                        .tripStatus(null)
                        .build())
                .build();

        when(processedEventRepository.existsById("evt-offer-1")).thenReturn(false);

        assertDoesNotThrow(() -> listener.handleTripStatusChanged(event));
        verify(availabilityRepository, never()).findByDriverId(any());
        verify(availabilityRepository, never()).save(any());
        verify(processedEventRepository, never()).save(any(ProcessedEvent.class));
    }

    @Test
    void handleTripStatusChanged_updatesAvailabilityToOnTripOnDriverAssigned() {
        UUID driverId = UUID.randomUUID();
        DriverAvailability existing = DriverAvailability.builder()
                .id(UUID.randomUUID())
                .status(AvailabilityStatus.AVAILABLE)
                .build();
        DomainEvent<TripEventPayload> event = DomainEvent.<TripEventPayload>builder()
                .eventId("evt-assigned-1")
                .eventType("trip.driver-assigned")
                .payload(TripEventPayload.builder()
                        .tripId("trip-1")
                        .driverId(driverId.toString())
                        .tripStatus("DRIVER_ASSIGNED")
                        .build())
                .build();

        when(processedEventRepository.existsById("evt-assigned-1")).thenReturn(false);
        when(availabilityRepository.findByDriverId(driverId)).thenReturn(Optional.of(existing));

        listener.handleTripStatusChanged(event);

        ArgumentCaptor<DriverAvailability> savedCaptor = ArgumentCaptor.forClass(DriverAvailability.class);
        verify(availabilityRepository).save(savedCaptor.capture());
        assertEquals(AvailabilityStatus.ON_TRIP, savedCaptor.getValue().getStatus());
        verify(processedEventRepository).save(any(ProcessedEvent.class));
    }

    @Test
    void handleAvailabilityUpdateFailure_onlyCompensatesDriverAssigned() {
        UUID driverId = UUID.randomUUID();
        DomainEvent<TripEventPayload> nonAssignedEvent = DomainEvent.<TripEventPayload>builder()
                .eventId("evt-offer-dlq")
                .eventType("trip.offer-updated")
                .payload(TripEventPayload.builder()
                        .tripId("trip-1")
                        .driverId(driverId.toString())
                        .tripStatus(null)
                        .build())
                .build();

        listener.handleAvailabilityUpdateFailure(nonAssignedEvent);
        verifyNoInteractions(rabbitTemplate);

        DomainEvent<TripEventPayload> assignedEvent = DomainEvent.<TripEventPayload>builder()
                .eventId("evt-assigned-dlq")
                .eventType("trip.driver-assigned")
                .payload(TripEventPayload.builder()
                        .tripId("trip-1")
                        .driverId(driverId.toString())
                        .tripStatus("DRIVER_ASSIGNED")
                        .build())
                .build();

        listener.handleAvailabilityUpdateFailure(assignedEvent);
        verify(rabbitTemplate).convertAndSend(
                eq("saga.compensating.exchange"),
                eq("driver.availability.failed"),
                any(DriverAvailabilityFailedPayload.class)
        );
    }
}
