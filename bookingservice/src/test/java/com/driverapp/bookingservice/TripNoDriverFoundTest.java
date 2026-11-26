package com.driverapp.bookingservice;

import com.driverapp.bookingservice.client.AiMatchingClient;
import com.driverapp.bookingservice.client.DriverServiceClient;
import com.driverapp.bookingservice.client.NotificationClient;
import com.driverapp.bookingservice.dto.request.CreateNotificationRequest;
import com.driverapp.bookingservice.event.OfferTimeoutPayload;
import com.driverapp.bookingservice.models.MatchingOffer;
import com.driverapp.bookingservice.models.MatchingSession;
import com.driverapp.bookingservice.models.Trip;
import com.driverapp.bookingservice.models.enums.MatchingOfferStatus;
import com.driverapp.bookingservice.models.enums.ShippingType;
import com.driverapp.bookingservice.models.enums.TripStatus;
import com.driverapp.bookingservice.models.enums.VehicleType;
import com.driverapp.bookingservice.publisher.MatchingEventPublisher;
import com.driverapp.bookingservice.repository.FoodRepository;
import com.driverapp.bookingservice.repository.MatchingOfferLogRepository;
import com.driverapp.bookingservice.repository.MatchingOfferRepository;
import com.driverapp.bookingservice.repository.MatchingSessionRepository;
import com.driverapp.bookingservice.repository.TripRepository;
import com.driverapp.bookingservice.service.RoutingService;
import com.driverapp.bookingservice.service.impl.MatchingServiceImpl;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TripNoDriverFoundTest {

    private static final String TRIP_ID = "trip-no-driver-1";
    private final UUID customerId = UUID.randomUUID();

    private DriverServiceClient driverServiceClient;
    private MatchingOfferRepository matchingOfferRepository;
    private MatchingSessionRepository matchingSessionRepository;
    private TripRepository tripRepository;
    private NotificationClient notificationClient;
    private MatchingEventPublisher matchingEventPublisher;
    private MongoTemplate mongoTemplate;
    private MatchingServiceImpl matchingService;

    @BeforeEach
    void setup() {
        driverServiceClient = mock(DriverServiceClient.class);
        matchingOfferRepository = mock(MatchingOfferRepository.class);
        matchingSessionRepository = mock(MatchingSessionRepository.class);
        tripRepository = mock(TripRepository.class);
        notificationClient = mock(NotificationClient.class);
        matchingEventPublisher = mock(MatchingEventPublisher.class);
        mongoTemplate = mock(MongoTemplate.class);

        matchingService = new MatchingServiceImpl(
                driverServiceClient,
                mock(RoutingService.class),
                mock(AiMatchingClient.class),
                matchingOfferRepository,
                mock(MatchingOfferLogRepository.class),
                matchingSessionRepository,
                tripRepository,
                notificationClient,
                matchingEventPublisher,
                mongoTemplate,
                mock(FoodRepository.class),
                new SimpleMeterRegistry()
        );
    }

    // [TC-ND-01] Vòng 1 không có tài xế quanh 3km -> lên lịch mở rộng sang Vòng 2, chưa đánh dấu NO_DRIVER_FOUND
    @Test
    void round1WithNoNearbyDriversSchedulesRound2InsteadOfMarkingNoDriverFound() {
        Trip searchingTrip = searchingTrip();
        when(matchingSessionRepository.findById(TRIP_ID)).thenReturn(Optional.empty());
        when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(searchingTrip));
        when(driverServiceClient.getNearbyDrivers(anyDouble(), anyDouble(), anyDouble(), any(), anyInt()))
                .thenReturn(List.of());

        matchingService.resumeRound(TRIP_ID, 1);

        verify(matchingEventPublisher).scheduleRound(TRIP_ID, 2);
        verify(mongoTemplate, never()).findAndModify(any(), any(), any(), eq(Trip.class));
        verifyNoInteractions(notificationClient);
    }

    // [TC-ND-02] Quét tới vòng cuối (Vòng 3) vẫn không có tài xế -> chuyển trip sang NO_DRIVER_FOUND và gửi thông báo cho khách hàng
    @Test
    void finalRoundWithNoNearbyDriversMarksTripNoDriverFoundAndNotifiesCustomer() {
        Trip searchingTrip = searchingTrip();
        Trip noDriverTrip = Trip.builder()
                .id(TRIP_ID).customerId(customerId).status(TripStatus.NO_DRIVER_FOUND)
                .shippingType(ShippingType.PASSENGER)
                .pickUpAddress("Hồ Gươm").destinationAddress("Mỹ Đình")
                .build();

        when(matchingSessionRepository.findById(TRIP_ID)).thenReturn(Optional.empty());
        when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(searchingTrip));
        when(driverServiceClient.getNearbyDrivers(anyDouble(), anyDouble(), anyDouble(), any(), anyInt()))
                .thenReturn(List.of());
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Trip.class)))
                .thenReturn(noDriverTrip);

        matchingService.resumeRound(TRIP_ID, 3);

        ArgumentCaptor<Update> updateCaptor = ArgumentCaptor.forClass(Update.class);
        verify(mongoTemplate).findAndModify(any(Query.class), updateCaptor.capture(), any(FindAndModifyOptions.class), eq(Trip.class));
        assertTrue(updateCaptor.getValue().getUpdateObject().toString().contains(TripStatus.NO_DRIVER_FOUND.name()));

        ArgumentCaptor<CreateNotificationRequest> notifCaptor = ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(notificationClient).createNotification(notifCaptor.capture());
        assertEquals("Không tìm được tài xế", notifCaptor.getValue().title());
        assertEquals(customerId, notifCaptor.getValue().userId());
    }

    // [TC-ND-03] Vòng cuối có tài xế nhưng hết hạn 25s (timeout DLX) không ai nhận -> offer EXPIRED, trip -> NO_DRIVER_FOUND và báo khách
    @Test
    void finalRoundLastCandidateTimeoutMarksTripNoDriverFoundAndNotifiesCustomer() {
        String offerId = TRIP_ID + ":3:1";
        MatchingOffer pendingOffer = MatchingOffer.builder()
                .id(offerId).tripId(TRIP_ID).searchRound(3)
                .status(MatchingOfferStatus.PENDING).build();
        MatchingSession session = MatchingSession.builder()
                .tripId(TRIP_ID).searchRound(3)
                .candidates(List.of(MatchingSession.CandidateDriver.builder().driverId(UUID.randomUUID()).rank(1).build()))
                .build();
        Trip noDriverTrip = Trip.builder()
                .id(TRIP_ID).customerId(customerId).status(TripStatus.NO_DRIVER_FOUND)
                .shippingType(ShippingType.FOOD_DELIVERY)
                .pickUpAddress("Quán A").destinationAddress("Nhà B")
                .build();

        when(matchingOfferRepository.findById(offerId)).thenReturn(Optional.of(pendingOffer));
        when(matchingSessionRepository.findById(TRIP_ID)).thenReturn(Optional.of(session));
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Trip.class)))
                .thenReturn(noDriverTrip);

        matchingService.handleOfferTimeout(OfferTimeoutPayload.builder()
                .tripId(TRIP_ID).offerId(offerId).rank(1).build());

        verify(mongoTemplate).findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(MatchingOffer.class));
        verify(mongoTemplate).findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Trip.class));

        ArgumentCaptor<CreateNotificationRequest> notifCaptor = ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(notificationClient).createNotification(notifCaptor.capture());
        assertTrue(notifCaptor.getValue().content().contains("Đơn giao món"));
    }

    // [TC-ND-04] Khách vừa kịp hủy hoặc tài xế vừa nhận trước khi đánh dấu NO_DRIVER_FOUND -> không ghi đè trạng thái, không gửi nhầm thông báo
    @Test
    void doesNotNotifyIfTripWasAlreadyAcceptedOrCancelledBeforeNoDriverFound() {
        when(matchingSessionRepository.findById(TRIP_ID)).thenReturn(Optional.empty());
        when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(searchingTrip()));
        when(driverServiceClient.getNearbyDrivers(anyDouble(), anyDouble(), anyDouble(), any(), anyInt()))
                .thenReturn(List.of());
        // Trip đã chuyển sang CANCELLED hoặc DRIVER_ASSIGNED -> findAndModify trả null
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Trip.class)))
                .thenReturn(null);

        matchingService.resumeRound(TRIP_ID, 3);

        verifyNoInteractions(notificationClient);
    }

    private Trip searchingTrip() {
        return Trip.builder()
                .id(TRIP_ID)
                .customerId(customerId)
                .status(TripStatus.SEARCHING_DRIVER)
                .pickUpLatitude(21.0285)
                .pickUpLongitude(105.8542)
                .vehicleType(VehicleType.MOTORBIKE)
                .shippingType(ShippingType.PASSENGER)
                .build();
    }
}
