package com.driverapp.bookingservice;

import com.driverapp.bookingservice.client.NotificationClient;
import com.driverapp.bookingservice.dto.request.CreateNotificationRequest;
import com.driverapp.bookingservice.dto.request.CreateTripRequest;
import com.driverapp.bookingservice.dto.request.FoodOrderItemRequest;
import com.driverapp.bookingservice.dto.response.CreateTripResponse;
import com.driverapp.bookingservice.event.TripEventPayload;
import com.driverapp.bookingservice.models.Food;
import com.driverapp.bookingservice.models.FoodOption;
import com.driverapp.bookingservice.models.Trip;
import com.driverapp.bookingservice.models.enums.ShippingType;
import com.driverapp.bookingservice.models.enums.TripStatus;
import com.driverapp.bookingservice.models.enums.VehicleType;
import com.driverapp.bookingservice.publisher.TripEventPublisher;
import com.driverapp.bookingservice.repository.FoodRepository;
import com.driverapp.bookingservice.repository.TripRepository;
import com.driverapp.bookingservice.service.impl.TripServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TripServiceCreateTripTest {

    private final UUID customerId = UUID.randomUUID();

    @Mock
    private TripRepository tripRepository;
    @Mock
    private FoodRepository foodRepository;
    @Mock
    private TripEventPublisher tripEventPublisher;
    @Mock
    private NotificationClient notificationClient;

    @InjectMocks
    private TripServiceImpl tripService;

    // [TC-CR-01] Đặt chuyến PASSENGER thành công khi khách chưa có chuyến trước đó: lưu REQUESTED, phát event & gửi notification
    @Test
    void createsPassengerTripSuccessfullyAndPublishesEventAndNotification() {
        when(tripRepository.findTopByCustomerIdOrderByCreatedAtDesc(customerId)).thenReturn(Optional.empty());
        when(tripRepository.save(any(Trip.class))).thenAnswer(inv -> {
            Trip t = inv.getArgument(0);
            t.setId("trip-001");
            return t;
        });

        CreateTripRequest request = passengerRequest(35_000.0);
        CreateTripResponse response = tripService.createTrip(customerId, request);

        assertEquals("Tạo chuyến thành công", response.message());
        assertEquals("trip-001", response.tripId());

        ArgumentCaptor<Trip> tripCaptor = ArgumentCaptor.forClass(Trip.class);
        verify(tripRepository).save(tripCaptor.capture());
        Trip saved = tripCaptor.getValue();
        assertEquals(TripStatus.REQUESTED, saved.getStatus());
        assertEquals(35_000.0, saved.getShippFare());
        assertNull(saved.getFoodSelectedsList());
        assertNull(saved.getTotalFoodPrice());

        ArgumentCaptor<TripEventPayload> eventCaptor = ArgumentCaptor.forClass(TripEventPayload.class);
        verify(tripEventPublisher).publishTripCreated(eventCaptor.capture());
        TripEventPayload payload = eventCaptor.getValue();
        assertEquals("trip-001", payload.getTripId());
        assertEquals(customerId.toString(), payload.getCustomerId());
        assertNull(payload.getDriverId());
        assertEquals("REQUESTED", payload.getTripStatus());
        assertEquals("PAY_DIRECTLY", payload.getPaymentMethod());
        assertEquals(0, BigDecimal.valueOf(35_000.0).compareTo(payload.getTotalAmount()));

        ArgumentCaptor<CreateNotificationRequest> notifCaptor = ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(notificationClient).createNotification(notifCaptor.capture());
        assertEquals("Chuyến đi đã được tạo", notifCaptor.getValue().title());
        assertEquals(customerId, notifCaptor.getValue().userId());
    }

    // [TC-CR-02] Cho phép đặt chuyến mới nếu chuyến trước đã kết thúc (COMPLETED, CANCELLED hoặc NO_DRIVER_FOUND)
    @ParameterizedTest
    @EnumSource(value = TripStatus.class, names = {"COMPLETED", "CANCELLED", "NO_DRIVER_FOUND"})
    void allowsCreatingNewTripAfterPreviousTripFinishedOrNoDriverFound(TripStatus previousStatus) {
        when(tripRepository.findTopByCustomerIdOrderByCreatedAtDesc(customerId))
                .thenReturn(Optional.of(Trip.builder().id("old-trip").status(previousStatus).build()));
        when(tripRepository.save(any(Trip.class))).thenAnswer(inv -> {
            Trip t = inv.getArgument(0);
            t.setId("new-trip");
            return t;
        });

        CreateTripResponse response = tripService.createTrip(customerId, passengerRequest(28_000.0));

        assertEquals("new-trip", response.tripId());
        verify(tripEventPublisher).publishTripCreated(any());
    }

    // [TC-CR-03] Chặn đặt trùng (409 CONFLICT) khi khách đang có chuyến REQUESTED hoặc SEARCHING_DRIVER
    @ParameterizedTest
    @EnumSource(value = TripStatus.class, names = {"REQUESTED", "SEARCHING_DRIVER"})
    void blocksDuplicateBookingWhenPreviousTripIsStillSearchingDriver(TripStatus activeStatus) {
        when(tripRepository.findTopByCustomerIdOrderByCreatedAtDesc(customerId))
                .thenReturn(Optional.of(Trip.builder().id("active-trip").status(activeStatus).build()));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> tripService.createTrip(customerId, passengerRequest(25_000.0)));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(tripRepository, never()).save(any());
        verifyNoInteractions(tripEventPublisher, notificationClient);
    }

    // [TC-CR-04] Đặt FOOD_DELIVERY nhiều món: khớp size không phân biệt hoa/thường, quantity=null mặc định 1, tính đúng tổng tiền
    @Test
    void createsFoodDeliveryTripWithMultipleItemsCaseInsensitiveSizeAndDefaultQuantity() {
        when(tripRepository.findTopByCustomerIdOrderByCreatedAtDesc(customerId)).thenReturn(Optional.empty());
        Food pho = Food.builder()
                .id("food-1")
                .name("Phở bò")
                .options(List.of(FoodOption.builder().size("M").price(45_000.0).build()))
                .build();
        Food tra = Food.builder()
                .id("food-2")
                .name("Trà đá")
                .options(List.of(FoodOption.builder().size("L").price(10_000.0).build()))
                .build();
        when(foodRepository.findById("food-1")).thenReturn(Optional.of(pho));
        when(foodRepository.findById("food-2")).thenReturn(Optional.of(tra));
        when(tripRepository.save(any(Trip.class))).thenAnswer(inv -> {
            Trip t = inv.getArgument(0);
            t.setId("food-trip-1");
            return t;
        });

        CreateTripRequest request = new CreateTripRequest(
                21.0285, 105.8542, "123 Phố Huế",
                "456 Cầu Giấy", 21.0365, 105.7905,
                ShippingType.FOOD_DELIVERY, VehicleType.MOTORBIKE, 20_000.0,
                List.of(
                        new FoodOrderItemRequest("food-1", "m", 2),
                        new FoodOrderItemRequest("food-2", "L", null)
                )
        );

        tripService.createTrip(customerId, request);

        ArgumentCaptor<Trip> tripCaptor = ArgumentCaptor.forClass(Trip.class);
        verify(tripRepository).save(tripCaptor.capture());
        Trip saved = tripCaptor.getValue();
        // 45_000 * 2 + 10_000 * 1 = 100_000
        assertEquals(100_000.0, saved.getTotalFoodPrice());
        assertEquals(2, saved.getFoodSelectedsList().size());
        assertEquals(1, saved.getFoodSelectedsList().get(1).getQuantity());

        ArgumentCaptor<TripEventPayload> eventCaptor = ArgumentCaptor.forClass(TripEventPayload.class);
        verify(tripEventPublisher).publishTripCreated(eventCaptor.capture());
        // 20_000 + 100_000 = 120_000
        assertEquals(0, BigDecimal.valueOf(120_000.0).compareTo(eventCaptor.getValue().getTotalAmount()));
    }

    // [TC-CR-05] Đặt FOOD_DELIVERY với danh sách món rỗng -> trả 400 BAD_REQUEST, không lưu DB
    @Test
    void rejectsFoodDeliveryWhenFoodsListIsEmpty() {
        when(tripRepository.findTopByCustomerIdOrderByCreatedAtDesc(customerId)).thenReturn(Optional.empty());
        CreateTripRequest request = new CreateTripRequest(
                21.0, 105.8, "A", "B", 21.1, 105.9,
                ShippingType.FOOD_DELIVERY, VehicleType.MOTORBIKE, 25_000.0, List.of()
        );

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> tripService.createTrip(customerId, request));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(tripRepository, never()).save(any());
        verifyNoInteractions(tripEventPublisher, notificationClient);
    }

    // [TC-CR-06] Đặt FOOD_DELIVERY với foodId không tồn tại -> trả 404 NOT_FOUND
    @Test
    void rejectsFoodDeliveryWhenFoodNotFound() {
        when(tripRepository.findTopByCustomerIdOrderByCreatedAtDesc(customerId)).thenReturn(Optional.empty());
        when(foodRepository.findById("missing-food")).thenReturn(Optional.empty());

        CreateTripRequest request = new CreateTripRequest(
                21.0, 105.8, "A", "B", 21.1, 105.9,
                ShippingType.FOOD_DELIVERY, VehicleType.MOTORBIKE, 25_000.0,
                List.of(new FoodOrderItemRequest("missing-food", "M", 1))
        );

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> tripService.createTrip(customerId, request));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        verify(tripRepository, never()).save(any());
    }

    // [TC-CR-07] Đặt FOOD_DELIVERY với size không có trong menu của món -> trả 400 BAD_REQUEST
    @Test
    void rejectsFoodDeliveryWhenSizeDoesNotExist() {
        when(tripRepository.findTopByCustomerIdOrderByCreatedAtDesc(customerId)).thenReturn(Optional.empty());
        when(foodRepository.findById("food-1")).thenReturn(Optional.of(
                Food.builder().id("food-1").name("Cơm tấm")
                        .options(List.of(FoodOption.builder().size("M").price(40_000.0).build()))
                        .build()
        ));

        CreateTripRequest request = new CreateTripRequest(
                21.0, 105.8, "A", "B", 21.1, 105.9,
                ShippingType.FOOD_DELIVERY, VehicleType.MOTORBIKE, 25_000.0,
                List.of(new FoodOrderItemRequest("food-1", "XL", 1))
        );

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> tripService.createTrip(customerId, request));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(tripRepository, never()).save(any());
    }

    // [TC-CR-08] Giá ship <= 0 tự động fallback về mức cố định mặc định 25,000đ
    @Test
    void fallsBackToFixedShippFareWhenRequestFareIsZeroOrNegative() {
        when(tripRepository.findTopByCustomerIdOrderByCreatedAtDesc(customerId)).thenReturn(Optional.empty());
        when(tripRepository.save(any(Trip.class))).thenAnswer(inv -> {
            Trip t = inv.getArgument(0);
            t.setId("trip-fallback");
            return t;
        });

        tripService.createTrip(customerId, passengerRequest(0.0));

        ArgumentCaptor<Trip> captor = ArgumentCaptor.forClass(Trip.class);
        verify(tripRepository).save(captor.capture());
        assertEquals(25_000.0, captor.getValue().getShippFare());
    }

    private CreateTripRequest passengerRequest(double fare) {
        return new CreateTripRequest(
                21.0285, 105.8542, "Hồ Gươm",
                "Mỹ Đình", 21.0285, 105.7642,
                ShippingType.PASSENGER, VehicleType.MOTORBIKE, fare, null
        );
    }
}
