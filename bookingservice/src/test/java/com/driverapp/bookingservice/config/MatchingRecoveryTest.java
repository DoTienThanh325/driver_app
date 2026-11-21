package com.driverapp.bookingservice.config;

import com.driverapp.bookingservice.client.*;
import com.driverapp.bookingservice.event.*;
import com.driverapp.bookingservice.exception.DependencyUnavailableException;
import com.driverapp.bookingservice.listener.*;
import com.driverapp.bookingservice.models.*;
import com.driverapp.bookingservice.models.enums.*;
import com.driverapp.bookingservice.publisher.MatchingEventPublisher;
import com.driverapp.bookingservice.repository.*;
import com.driverapp.bookingservice.service.*;
import com.driverapp.bookingservice.service.impl.MatchingServiceImpl;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MatchingRecoveryTest {
    @Test void failedListenerDeliveryIsNotAcknowledgedAsSuccess() {
        var matching = mock(MatchingService.class);
        var timeout = new OfferTimeoutListener(matching);
        var payload = OfferTimeoutPayload.builder().tripId("trip").offerId("offer").rank(1).build();
        doThrow(new DependencyUnavailableException(false, null)).when(matching).handleOfferTimeout(payload);
        assertThrows(DependencyUnavailableException.class, () -> timeout.onOfferTimeout(payload));
    }
    @Test void redeliveryResumesSearchingTripWhenDriverServiceIsUnavailable() {
        var drivers = mock(DriverServiceClient.class);
        var trips = mock(TripRepository.class);
        var sessions = mock(MatchingSessionRepository.class);
        var mongo = mock(MongoTemplate.class);
        var trip = Trip.builder().id("trip").status(TripStatus.SEARCHING_DRIVER).searchRound(1)
                .pickUpLatitude(21.0).pickUpLongitude(105.0).build();
        when(trips.findById("trip")).thenReturn(Optional.of(trip));
        when(sessions.findById("trip")).thenReturn(Optional.empty());
        when(drivers.getNearbyDrivers(anyDouble(), anyDouble(), anyDouble(), any(), anyInt()))
                .thenThrow(new DependencyUnavailableException(false, null));
        var service = service(drivers, trips, sessions, mongo, mock(MatchingOfferRepository.class), mock(NotificationClient.class), mock(MatchingEventPublisher.class));
        var event = TripEventPayload.builder().tripId("trip").build();
        for (int i = 0; i < 2; i++) assertThrows(DependencyUnavailableException.class, () -> service.handleTripCreated(event));
        verify(drivers, times(2)).getNearbyDrivers(anyDouble(), anyDouble(), anyDouble(), any(), anyInt());
        assertEquals(TripStatus.SEARCHING_DRIVER, trip.getStatus());
    }
    @Test void redeliveryReusesDispatchedOfferWithoutRecreatingItOrResettingItsTimer() {
        var trips = mock(TripRepository.class);
        var sessions = mock(MatchingSessionRepository.class);
        var offers = mock(MatchingOfferRepository.class);
        var mongo = mock(MongoTemplate.class);
        var notifications = mock(NotificationClient.class);
        var publisher = mock(MatchingEventPublisher.class);
        var candidate = MatchingSession.CandidateDriver.builder().driverId(UUID.randomUUID()).rank(1).build();
        var session = MatchingSession.builder().tripId("trip").searchRound(1).candidates(List.of(candidate)).build();
        when(sessions.findById("trip")).thenReturn(Optional.of(session));
        when(trips.findById("trip")).thenReturn(Optional.of(Trip.builder().id("trip").status(TripStatus.SEARCHING_DRIVER).build()));
        when(offers.findById("trip:1:1")).thenReturn(Optional.of(MatchingOffer.builder().id("trip:1:1")
                .status(MatchingOfferStatus.PENDING).timeoutScheduled(true).notificationSent(true).build()));
        service(mock(DriverServiceClient.class), trips, sessions, mongo, offers, notifications, publisher).resumeRound("trip", 1);
        verify(mongo, never()).insert(any(MatchingOffer.class));
        verifyNoInteractions(notifications, publisher);
    }
    private MatchingServiceImpl service(DriverServiceClient drivers, TripRepository trips,
            MatchingSessionRepository sessions, MongoTemplate mongo, MatchingOfferRepository offers,
            NotificationClient notifications, MatchingEventPublisher publisher) {
        return new MatchingServiceImpl(drivers, mock(RoutingService.class), mock(AiMatchingClient.class), offers,
                mock(MatchingOfferLogRepository.class), sessions, trips, notifications, publisher, mongo, mock(com.driverapp.bookingservice.repository.FoodRepository.class), new SimpleMeterRegistry());
    }
}
