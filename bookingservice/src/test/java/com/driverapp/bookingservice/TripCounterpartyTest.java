package com.driverapp.bookingservice;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.driverapp.bookingservice.client.DriverRatingClient;
import com.driverapp.bookingservice.client.UserServiceClient;
import com.driverapp.bookingservice.dto.response.TripCounterpartyResponse;
import com.driverapp.bookingservice.dto.response.UserInfoResponse;
import com.driverapp.bookingservice.models.Trip;
import com.driverapp.bookingservice.models.enums.VehicleType;
import com.driverapp.bookingservice.repository.TripRepository;
import com.driverapp.bookingservice.service.impl.TripServiceImpl;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class TripCounterpartyTest {
    private static final String TRIP_ID = "trip-1";
    private final UUID customerId = UUID.randomUUID();
    private final UUID driverId = UUID.randomUUID();

    @Mock
    private TripRepository tripRepository;
    @Mock
    private UserServiceClient users;
    @Mock
    private DriverRatingClient ratings;
    @InjectMocks private TripServiceImpl trips;

    @Test
    void customerGetsAssignedDriverAndActualRating() {
        stubTrip(driverId);
        when(users.getUserInfo(driverId)).thenReturn(new UserInfoResponse(driverId, "DoTienThanh", null));
        when(ratings.getAverageRating(driverId)).thenReturn(4.5);

        assertEquals(new TripCounterpartyResponse(
                TripCounterpartyResponse.Role.DRIVER, "DoTienThanh", null, VehicleType.MOTORBIKE, 4.5),
                trips.getTripCounterparty(TRIP_ID, customerId));
    }

    @Test
    void assignedDriverGetsCustomer() {
        stubTrip(driverId);
        when(users.getUserInfo(customerId)).thenReturn(new UserInfoResponse(customerId, "PhamQuangVinh", null));

        assertEquals(new TripCounterpartyResponse(
                TripCounterpartyResponse.Role.CUSTOMER, "PhamQuangVinh", null, null, null),
                trips.getTripCounterparty(TRIP_ID, driverId));
        verifyNoInteractions(ratings);
    }

    @Test
    void unrelatedUserIsRejectedBeforeProfileLookup() {
        stubTrip(driverId);

        var error = assertThrows(ResponseStatusException.class,
                () -> trips.getTripCounterparty(TRIP_ID, UUID.randomUUID()));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verifyNoInteractions(users, ratings);
    }

    @Test
    void customerWaitingForDriverReceivesNoProfile() {
        stubTrip(null);
        assertNull(trips.getTripCounterparty(TRIP_ID, customerId));
        verifyNoInteractions(users, ratings);
    }

    private void stubTrip(UUID assignedDriver) {
        when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(Trip.builder()
                .customerId(customerId)
                .driverId(assignedDriver)
                .vehicleType(VehicleType.MOTORBIKE)
                .build()));
    }
}
