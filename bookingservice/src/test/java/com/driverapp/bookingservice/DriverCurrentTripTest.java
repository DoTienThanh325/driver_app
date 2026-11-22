package com.driverapp.bookingservice;

import com.driverapp.bookingservice.models.FoodSelected;
import com.driverapp.bookingservice.models.Trip;
import com.driverapp.bookingservice.models.enums.ShippingType;
import com.driverapp.bookingservice.models.enums.TripStatus;
import com.driverapp.bookingservice.repository.TripRepository;
import com.driverapp.bookingservice.service.impl.TripServiceImpl;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DriverCurrentTripTest {
    private static final List<TripStatus> ACTIVE_STATUSES =
            List.of(TripStatus.DRIVER_ASSIGNED, TripStatus.DRIVER_ARRIVING, TripStatus.IN_PROGRESS);
    private final UUID driver = UUID.randomUUID();

    @Mock
    private TripRepository tripRepository;

    @InjectMocks
    private TripServiceImpl tripService;

    @Test
    void prioritizesTripInProgressAndReturnsAcceptedBackToBackSeparately() {
        var queued = trip("queued", TripStatus.DRIVER_ASSIGNED, true);
        var current = trip("current", TripStatus.IN_PROGRESS, false);
        stubTrips(queued, current);

        var response = tripService.getDriverCurrentTrips(driver);

        assertEquals("current", response.currentTrip().id());
        assertEquals("queued", response.queuedTrip().id());
    }

    @Test
    void promotesBackToBackWhenPreviousTripLeavesActiveStatuses() {
        var queued = trip("queued", TripStatus.DRIVER_ASSIGNED, true);
        stubTrips(queued);

        var response = tripService.getDriverCurrentTrips(driver);

        assertEquals("queued", response.currentTrip().id());
        assertNull(response.queuedTrip());
    }

    @Test
    void returnsFoodOrderForTripAlreadyAtPickup() {
        var assigned = trip("assigned", TripStatus.DRIVER_ASSIGNED, false);
        var arrived = trip("arrived", TripStatus.DRIVER_ARRIVING, false);
        arrived.setShippingType(ShippingType.FOOD_DELIVERY);
        arrived.setFoodSelectedsList(List.of(FoodSelected.builder().foodName("Bún").quantity(2).build()));
        stubTrips(assigned, arrived);

        var response = tripService.getDriverCurrentTrips(driver);

        assertEquals("arrived", response.currentTrip().id());
        assertEquals("Bún", response.currentTrip().foods().getFirst().getFoodName());
        assertEquals(2, response.currentTrip().foods().getFirst().getQuantity());
        assertNull(response.queuedTrip());
    }

    @Test
    void returnsEmptyWhenDriverHasNoCurrentTrips() {
        stubTrips();

        var response = tripService.getDriverCurrentTrips(driver);

        assertNull(response.currentTrip());
        assertNull(response.queuedTrip());
    }

    private Trip trip(String id, TripStatus status, boolean backToBack) {
        return Trip.builder().id(id).status(status).backToBack(backToBack).build();
    }

    private void stubTrips(Trip... trips) {
        when(tripRepository.findByDriverIdAndStatusInOrderByCreatedAtAscIdAsc(driver, ACTIVE_STATUSES))
                .thenReturn(List.of(trips));
    }
}
