package com.driverapp.bookingservice;

import com.driverapp.bookingservice.dto.request.UpdateTripStatusRequest;
import com.driverapp.bookingservice.event.TripEventPayload;
import com.driverapp.bookingservice.models.Trip;
import com.driverapp.bookingservice.models.enums.ShippingType;
import com.driverapp.bookingservice.models.enums.TripStatus;
import com.driverapp.bookingservice.publisher.TripEventPublisher;
import com.driverapp.bookingservice.repository.TripRepository;
import com.driverapp.bookingservice.service.impl.TripServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TripServiceUpdateStatusTest {

    private static final String TRIP_ID = "trip-status-1";
    private final UUID customerId = UUID.randomUUID();
    private final UUID driverId = UUID.randomUUID();

    @Mock
    private TripRepository tripRepository;
    @Mock
    private MongoTemplate mongoTemplate;
    @Mock
    private TripEventPublisher tripEventPublisher;

    @InjectMocks
    private TripServiceImpl tripService;

    // [TC-UP-01] Chuyển trạng thái trung gian hợp lệ (DRIVER_ASSIGNED -> DRIVER_ARRIVING -> IN_PROGRESS) và phát đúng routing key
    @ParameterizedTest
    @CsvSource({
            "DRIVER_ASSIGNED, DRIVER_ARRIVING, trip.driver-arriving",
            "DRIVER_ARRIVING, IN_PROGRESS, trip.in-progress"
    })
    void updatesIntermediateStatusAndPublishesRoutingKey(
            TripStatus currentStatus, TripStatus nextStatus, String expectedRoutingKey) {
        Trip current = trip(currentStatus, driverId, 25_000.0, null);
        Trip updated = trip(nextStatus, driverId, 25_000.0, null);

        when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(current));
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Trip.class)))
                .thenReturn(updated);

        tripService.updateTripStatus(driverId, new UpdateTripStatusRequest(TRIP_ID, nextStatus));

        ArgumentCaptor<TripEventPayload> payloadCaptor = ArgumentCaptor.forClass(TripEventPayload.class);
        verify(tripEventPublisher).publishTripEvent(eq(expectedRoutingKey), payloadCaptor.capture());
        assertEquals(nextStatus.name(), payloadCaptor.getValue().getTripStatus());
        verify(tripEventPublisher, never()).publishTripCompleted(any());
    }

    // [TC-UP-02] Hoàn thành chuyến (IN_PROGRESS -> COMPLETED) có đơn đồ ăn: phát publishTripCompleted với tổng tiền ship + đồ ăn
    @Test
    void completesTripWithFoodPriceAndPublishesCompletedEvent() {
        Trip current = trip(TripStatus.IN_PROGRESS, driverId, 25_000.0, 50_000.0);
        Trip updated = trip(TripStatus.COMPLETED, driverId, 25_000.0, 50_000.0);

        when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(current));
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Trip.class)))
                .thenReturn(updated);

        tripService.updateTripStatus(driverId, new UpdateTripStatusRequest(TRIP_ID, TripStatus.COMPLETED));

        ArgumentCaptor<TripEventPayload> payloadCaptor = ArgumentCaptor.forClass(TripEventPayload.class);
        verify(tripEventPublisher).publishTripCompleted(payloadCaptor.capture());
        assertEquals(0, BigDecimal.valueOf(75_000.0).compareTo(payloadCaptor.getValue().getTotalAmount()));
        verify(tripEventPublisher, never()).publishTripEvent(anyString(), any());
    }

    // [TC-UP-03] Hoàn thành chuyến không có đồ ăn (totalFoodPrice=null): xử lý an toàn không bị NullPointerException
    @Test
    void completesTripWithNullFoodPriceSafely() {
        Trip current = trip(TripStatus.IN_PROGRESS, driverId, 30_000.0, null);
        Trip updated = trip(TripStatus.COMPLETED, driverId, 30_000.0, null);

        when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(current));
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Trip.class)))
                .thenReturn(updated);

        tripService.updateTripStatus(driverId, new UpdateTripStatusRequest(TRIP_ID, TripStatus.COMPLETED));

        ArgumentCaptor<TripEventPayload> payloadCaptor = ArgumentCaptor.forClass(TripEventPayload.class);
        verify(tripEventPublisher).publishTripCompleted(payloadCaptor.capture());
        assertEquals(0, BigDecimal.valueOf(30_000.0).compareTo(payloadCaptor.getValue().getTotalAmount()));
    }

    // [TC-UP-04] Không tìm thấy tripId -> trả 404 NOT_FOUND
    @Test
    void throwsNotFoundWhenTripDoesNotExist() {
        when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> tripService.updateTripStatus(driverId, new UpdateTripStatusRequest(TRIP_ID, TripStatus.DRIVER_ARRIVING)));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verifyNoInteractions(mongoTemplate, tripEventPublisher);
    }

    // [TC-UP-05] Chuyến chưa gán tài xế hoặc tài xế khác gọi cập nhật -> trả 403 FORBIDDEN
    @Test
    void throwsForbiddenWhenTripHasNoDriverOrDifferentDriver() {
        when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip(TripStatus.DRIVER_ASSIGNED, null, 25_000.0, null)));
        ResponseStatusException noDriverEx = assertThrows(ResponseStatusException.class,
                () -> tripService.updateTripStatus(driverId, new UpdateTripStatusRequest(TRIP_ID, TripStatus.DRIVER_ARRIVING)));
        assertEquals(HttpStatus.FORBIDDEN, noDriverEx.getStatusCode());

        when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip(TripStatus.DRIVER_ASSIGNED, UUID.randomUUID(), 25_000.0, null)));
        ResponseStatusException otherDriverEx = assertThrows(ResponseStatusException.class,
                () -> tripService.updateTripStatus(driverId, new UpdateTripStatusRequest(TRIP_ID, TripStatus.DRIVER_ARRIVING)));
        assertEquals(HttpStatus.FORBIDDEN, otherDriverEx.getStatusCode());

        verifyNoInteractions(mongoTemplate, tripEventPublisher);
    }

    // [TC-UP-06] Chuyến đã ở trạng thái kết thúc (COMPLETED / CANCELLED) -> trả 409 CONFLICT
    @ParameterizedTest
    @CsvSource({"COMPLETED", "CANCELLED"})
    void throwsConflictWhenTripAlreadyFinished(TripStatus terminalStatus) {
        when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip(terminalStatus, driverId, 25_000.0, null)));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> tripService.updateTripStatus(driverId, new UpdateTripStatusRequest(TRIP_ID, TripStatus.IN_PROGRESS)));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verifyNoInteractions(mongoTemplate, tripEventPublisher);
    }

    // [TC-UP-07] Tài xế cố tình gửi CANCELLED để hủy chuyến -> bị chặn với 403 FORBIDDEN
    @Test
    void blocksDriverFromCancellingTrip() {
        when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip(TripStatus.DRIVER_ASSIGNED, driverId, 25_000.0, null)));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> tripService.updateTripStatus(driverId, new UpdateTripStatusRequest(TRIP_ID, TripStatus.CANCELLED)));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verifyNoInteractions(mongoTemplate, tripEventPublisher);
    }

    // [TC-UP-08] Chuyển trạng thái nhảy cóc hoặc đi lùi (không đúng state machine) -> trả 400 BAD_REQUEST
    @ParameterizedTest
    @CsvSource({
            "DRIVER_ASSIGNED, IN_PROGRESS",
            "DRIVER_ASSIGNED, COMPLETED",
            "IN_PROGRESS, DRIVER_ARRIVING",
            "SEARCHING_DRIVER, DRIVER_ARRIVING"
    })
    void rejectsInvalidStateTransitions(TripStatus current, TripStatus target) {
        when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip(current, driverId, 25_000.0, null)));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> tripService.updateTripStatus(driverId, new UpdateTripStatusRequest(TRIP_ID, target)));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verifyNoInteractions(mongoTemplate, tripEventPublisher);
    }

    // [TC-UP-09] Atomic update findAndModify trả null bất thường -> trả 500 INTERNAL_SERVER_ERROR và không phát event
    @Test
    void throwsInternalServerErrorWhenAtomicUpdateReturnsNull() {
        when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip(TripStatus.DRIVER_ASSIGNED, driverId, 25_000.0, null)));
        when(mongoTemplate.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Trip.class)))
                .thenReturn(null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> tripService.updateTripStatus(driverId, new UpdateTripStatusRequest(TRIP_ID, TripStatus.DRIVER_ARRIVING)));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, ex.getStatusCode());
        verifyNoInteractions(tripEventPublisher);
    }

    private Trip trip(TripStatus status, UUID assignedDriver, double fare, Double foodPrice) {
        return Trip.builder()
                .id(TRIP_ID)
                .customerId(customerId)
                .driverId(assignedDriver)
                .status(status)
                .shippFare(fare)
                .totalFoodPrice(foodPrice)
                .shippingType(ShippingType.PASSENGER)
                .build();
    }
}
