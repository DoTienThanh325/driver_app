package com.driverapp.bookingservice.service;

import com.driverapp.bookingservice.dto.request.CancelTripRequest;
import com.driverapp.bookingservice.dto.request.CreateTripRequest;
import com.driverapp.bookingservice.dto.request.UpdateTripStatusRequest;
import com.driverapp.bookingservice.dto.response.AcceptTripResponse;
import com.driverapp.bookingservice.dto.response.CreateTripResponse;
import com.driverapp.bookingservice.dto.response.DriverCurrentTripResponse;
import com.driverapp.bookingservice.dto.response.DriverTripResponse;
import com.driverapp.bookingservice.dto.response.TripCounterpartyResponse;
import com.driverapp.bookingservice.models.Trip;
import com.driverapp.bookingservice.models.enums.TripStatus;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.UUID;

public interface TripService {
    CreateTripResponse createTrip(UUID customerId, CreateTripRequest request);
    AcceptTripResponse acceptTrip(String tripId, UUID driverUserId);
    void updateTripStatus(UUID driverUserId, UpdateTripStatusRequest request);
    void cancelTripByCustomer(String tripId, UUID customerId, CancelTripRequest request);
    long countCompletedTrips(UUID customerId);
    com.driverapp.bookingservice.dto.response.TripPriceDto getTripPrice(String tripId);
    Trip getTripById(String tripId);
    TripCounterpartyResponse getTripCounterparty(String tripId, UUID userId);
    Trip getCurrentTrip(UUID customerId);
    DriverCurrentTripResponse getDriverCurrentTrips(UUID driverId);
    Page<Trip> getCustomerTripHistory(UUID customerId, int page, int size);
    java.util.Map<String, Object> simulateMatchingForDriver(UUID driverUserId, double lat, double lng, com.driverapp.bookingservice.models.enums.VehicleType vehicleType);
    Page<DriverTripResponse> getDriverTripHistory(UUID driverUserId, List<TripStatus> statuses, int page, int size);
}
