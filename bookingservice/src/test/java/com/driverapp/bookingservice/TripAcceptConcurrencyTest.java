package com.driverapp.bookingservice;

import com.driverapp.bookingservice.client.DriverServiceClient;
import com.driverapp.bookingservice.dto.response.AcceptTripResponse;
import com.driverapp.bookingservice.models.MatchingOffer;
import com.driverapp.bookingservice.models.MatchingOfferLog;
import com.driverapp.bookingservice.models.Trip;
import com.driverapp.bookingservice.models.enums.MatchingOfferStatus;
import com.driverapp.bookingservice.models.enums.ShippingType;
import com.driverapp.bookingservice.models.enums.TripStatus;
import com.driverapp.bookingservice.publisher.TripEventPublisher;
import com.driverapp.bookingservice.repository.MatchingOfferLogRepository;
import com.driverapp.bookingservice.repository.MatchingOfferRepository;
import com.driverapp.bookingservice.repository.TripRepository;
import com.driverapp.bookingservice.service.impl.TripServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TripAcceptConcurrencyTest {

    private static final String TRIP_ID = "trip-race-1";
    private final UUID customerId = UUID.randomUUID();
    private final UUID driverA = UUID.randomUUID();
    private final UUID driverB = UUID.randomUUID();

    @Mock
    private TripRepository tripRepository;
    @Mock
    private DriverServiceClient driverServiceClient;
    @Mock
    private MongoTemplate mongoTemplate;
    @Mock
    private TripEventPublisher tripEventPublisher;
    @Mock
    private MatchingOfferRepository matchingOfferRepository;
    @Mock
    private MatchingOfferLogRepository matchingOfferLogRepository;

    @InjectMocks
    private TripServiceImpl tripService;

    // [TC-AC-01] Tài xế chậm mạng bấm nhận chuyến nhiều lần tuần tự: lần 1 thành công, lần 2 trả 409 CONFLICT và không bắn trùng event
    @Test
    void slowNetworkDriverClicksAcceptTwiceSequentiallyThrowsConflictAndDoesNotDuplicateEvents() {
        when(matchingOfferRepository.findFirstByTripIdAndDriverIdAndStatusOrderByCreatedAtDesc(
                TRIP_ID, driverA, MatchingOfferStatus.PENDING))
                .thenReturn(Optional.empty());
        when(matchingOfferRepository.findByTripIdAndStatusIn(eq(TRIP_ID), anyList()))
                .thenReturn(List.of());

        Trip assignedTrip = Trip.builder()
                .id(TRIP_ID)
                .customerId(customerId)
                .driverId(driverA)
                .status(TripStatus.DRIVER_ASSIGNED)
                .shippFare(25_000.0)
                .shippingType(ShippingType.PASSENGER)
                .build();

        // Lần 1 thắng atomic update, lần 2 (retry do chậm mạng) findAndModify trả null
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Trip.class)))
                .thenReturn(assignedTrip)
                .thenReturn(null);
        when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(assignedTrip));

        AcceptTripResponse first = tripService.acceptTrip(TRIP_ID, driverA);
        assertEquals(TripStatus.DRIVER_ASSIGNED.name(), first.status());

        ResponseStatusException second = assertThrows(ResponseStatusException.class,
                () -> tripService.acceptTrip(TRIP_ID, driverA));
        assertEquals(HttpStatus.CONFLICT, second.getStatusCode());

        verify(tripEventPublisher, times(1)).publishDriverAssigned(any());
    }

    // [TC-AC-02] Tài xế double-tap cực nhanh (2 request song song từ 1 driver): chỉ 1 request thắng, request còn lại 409 CONFLICT
    @Test
    void slowNetworkDoubleTapConcurrentlyAllowsOnlyOneSuccess() throws Exception {
        when(matchingOfferRepository.findFirstByTripIdAndDriverIdAndStatusOrderByCreatedAtDesc(
                eq(TRIP_ID), eq(driverA), eq(MatchingOfferStatus.PENDING)))
                .thenReturn(Optional.empty());
        when(matchingOfferRepository.findByTripIdAndStatusIn(eq(TRIP_ID), anyList()))
                .thenReturn(List.of());

        AtomicBoolean claimed = new AtomicBoolean(false);
        Trip assignedTrip = Trip.builder()
                .id(TRIP_ID).customerId(customerId).driverId(driverA)
                .status(TripStatus.DRIVER_ASSIGNED).shippFare(30_000.0)
                .shippingType(ShippingType.PASSENGER).build();

        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Trip.class)))
                .thenAnswer(inv -> claimed.compareAndSet(false, true) ? assignedTrip : null);
        when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(assignedTrip));

        List<Object> results = runConcurrently(
                () -> tripService.acceptTrip(TRIP_ID, driverA),
                () -> tripService.acceptTrip(TRIP_ID, driverA)
        );

        long successes = results.stream().filter(AcceptTripResponse.class::isInstance).count();
        long conflicts = results.stream().filter(ResponseStatusException.class::isInstance).count();
        assertEquals(1, successes);
        assertEquals(1, conflicts);
        verify(tripEventPublisher, times(1)).publishDriverAssigned(any());
    }

    // [TC-AC-03] 2 tài xế A và B cùng bấm nhận 1 chuyến đồng thời: findAndModify atomic đảm bảo chỉ 1 người thắng, người kia 409 CONFLICT
    @Test
    void twoDriversRaceForSameTripOnlyWinnerGetsAssignedAndLoserGetsConflict() throws Exception {
        when(matchingOfferRepository.findFirstByTripIdAndDriverIdAndStatusOrderByCreatedAtDesc(
                eq(TRIP_ID), any(UUID.class), eq(MatchingOfferStatus.PENDING)))
                .thenReturn(Optional.empty());
        when(matchingOfferRepository.findByTripIdAndStatusIn(eq(TRIP_ID), anyList()))
                .thenReturn(List.of());

        AtomicBoolean claimed = new AtomicBoolean(false);
        Trip winnerTrip = Trip.builder()
                .id(TRIP_ID).customerId(customerId).driverId(driverA)
                .status(TripStatus.DRIVER_ASSIGNED).shippFare(25_000.0)
                .shippingType(ShippingType.PASSENGER).build();

        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Trip.class)))
                .thenAnswer(inv -> claimed.compareAndSet(false, true) ? winnerTrip : null);
        when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(winnerTrip));

        List<Object> results = runConcurrently(
                () -> tripService.acceptTrip(TRIP_ID, driverA),
                () -> tripService.acceptTrip(TRIP_ID, driverB)
        );

        long successes = results.stream().filter(AcceptTripResponse.class::isInstance).count();
        List<ResponseStatusException> errors = results.stream()
                .filter(ResponseStatusException.class::isInstance)
                .map(ResponseStatusException.class::cast)
                .toList();

        assertEquals(1, successes);
        assertEquals(1, errors.size());
        assertEquals(HttpStatus.CONFLICT, errors.getFirst().getStatusCode());
        verify(tripEventPublisher, times(1)).publishDriverAssigned(any());
    }

    // [TC-AC-04] Khi nhận chuyến thành công: offer người thắng -> ACCEPTED, ghi log ML isAccepted=1, hủy các offer còn lại -> CANCELLED
    @Test
    void acceptTripMarksWinnerOfferAcceptedLogsShadowAndCancelsOtherOffers() {
        MatchingOffer winnerOffer = MatchingOffer.builder()
                .id(TRIP_ID + ":1:1").tripId(TRIP_ID).driverId(driverA)
                .status(MatchingOfferStatus.PENDING).backToBack(false).build();
        MatchingOffer otherPending = MatchingOffer.builder()
                .id(TRIP_ID + ":1:2").tripId(TRIP_ID).driverId(driverB)
                .status(MatchingOfferStatus.PENDING).build();
        MatchingOfferLog logEntry = MatchingOfferLog.builder()
                .offerId(winnerOffer.getId()).tripId(TRIP_ID).driverId(driverA).build();

        when(matchingOfferRepository.findFirstByTripIdAndDriverIdAndStatusOrderByCreatedAtDesc(
                TRIP_ID, driverA, MatchingOfferStatus.PENDING)).thenReturn(Optional.of(winnerOffer));
        when(matchingOfferLogRepository.findByOfferId(winnerOffer.getId())).thenReturn(Optional.of(logEntry));
        when(matchingOfferRepository.findByTripIdAndStatusIn(eq(TRIP_ID), anyList()))
                .thenReturn(List.of(otherPending));

        Trip assignedTrip = Trip.builder()
                .id(TRIP_ID).customerId(customerId).driverId(driverA)
                .status(TripStatus.DRIVER_ASSIGNED).shippFare(25_000.0)
                .shippingType(ShippingType.PASSENGER).build();
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Trip.class)))
                .thenReturn(assignedTrip);

        tripService.acceptTrip(TRIP_ID, driverA);

        assertEquals(MatchingOfferStatus.ACCEPTED, winnerOffer.getStatus());
        assertEquals(1, logEntry.getIsAccepted());
        assertEquals(MatchingOfferStatus.CANCELLED, otherPending.getStatus());
        verify(matchingOfferRepository).save(winnerOffer);
        verify(matchingOfferLogRepository).save(logEntry);
        verify(matchingOfferRepository).saveAll(List.of(otherPending));
    }

    // [TC-AC-05] Nhận cuốc gối đầu (backToBack=true): bỏ qua kiểm tra AVAILABLE (vì tài xế đang ON_TRIP vẫn hợp lệ)
    @Test
    void backToBackAcceptSkipsDriverAvailabilityCheck() {
        MatchingOffer b2bOffer = MatchingOffer.builder()
                .id(TRIP_ID + ":1:1").tripId(TRIP_ID).driverId(driverA)
                .status(MatchingOfferStatus.PENDING).backToBack(true).build();
        when(matchingOfferRepository.findFirstByTripIdAndDriverIdAndStatusOrderByCreatedAtDesc(
                TRIP_ID, driverA, MatchingOfferStatus.PENDING)).thenReturn(Optional.of(b2bOffer));
        when(matchingOfferLogRepository.findByOfferId(b2bOffer.getId())).thenReturn(Optional.empty());
        when(matchingOfferRepository.findByTripIdAndStatusIn(eq(TRIP_ID), anyList())).thenReturn(List.of());

        Trip assigned = Trip.builder()
                .id(TRIP_ID).customerId(customerId).driverId(driverA).backToBack(true)
                .status(TripStatus.DRIVER_ASSIGNED).shippFare(25_000.0)
                .shippingType(ShippingType.PASSENGER).build();
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Trip.class)))
                .thenReturn(assigned);

        AcceptTripResponse response = tripService.acceptTrip(TRIP_ID, driverA);

        assertEquals(TripStatus.DRIVER_ASSIGNED.name(), response.status());
        verifyNoInteractions(driverServiceClient);
    }

    // [TC-AC-06] Tài xế thường không khả dụng -> chặn ngay trước khi chạm vào MongoDB
    @Test
    void unavailableNormalDriverIsRejectedBeforeTouchingDatabase() {
        when(matchingOfferRepository.findFirstByTripIdAndDriverIdAndStatusOrderByCreatedAtDesc(
                TRIP_ID, driverA, MatchingOfferStatus.PENDING)).thenReturn(Optional.empty());
        doThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Tài xế không khả dụng"))
                .when(driverServiceClient).checkDriverAvailable(driverA);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> tripService.acceptTrip(TRIP_ID, driverA));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verifyNoInteractions(mongoTemplate, tripEventPublisher);
    }

    @SafeVarargs
    private List<Object> runConcurrently(ThrowingSupplier<AcceptTripResponse>... tasks) throws Exception {
        CountDownLatch ready = new CountDownLatch(tasks.length);
        CountDownLatch start = new CountDownLatch(1);
        List<Object> results = Collections.synchronizedList(new ArrayList<>());

        try (ExecutorService pool = Executors.newFixedThreadPool(tasks.length)) {
            List<Future<?>> futures = new ArrayList<>();
            for (ThrowingSupplier<AcceptTripResponse> task : tasks) {
                futures.add(pool.submit(() -> {
                    ready.countDown();
                    start.await(2, TimeUnit.SECONDS);
                    try {
                        results.add(task.get());
                    } catch (Throwable t) {
                        results.add(t);
                    }
                    return null;
                }));
            }
            assertTrue(ready.await(2, TimeUnit.SECONDS));
            start.countDown();
            for (Future<?> f : futures) {
                f.get(3, TimeUnit.SECONDS);
            }
        }
        return results;
    }

    @FunctionalInterface
    private interface ThrowingSupplier<T> {
        T get() throws Exception;
    }
}
