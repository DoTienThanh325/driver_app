package com.driverapp.bookingservice.service;

import com.driverapp.bookingservice.dto.request.CancelTripRequest;
import com.driverapp.bookingservice.dto.request.CreateTripRequest;
import com.driverapp.bookingservice.dto.request.UpdateTripStatusRequest;
import com.driverapp.bookingservice.dto.response.AcceptTripResponse;
import com.driverapp.bookingservice.dto.response.CreateTripResponse;
import com.driverapp.bookingservice.models.Trip;

import java.util.UUID;

public interface TripService {
    CreateTripResponse createTrip(UUID customerId, CreateTripRequest request);
    AcceptTripResponse acceptTrip(String tripId, UUID driverUserId);
    void updateTripStatus(UUID driverUserId, UpdateTripStatusRequest request);
    void cancelTripByCustomer(String tripId, UUID customerId, CancelTripRequest request);
    long countCompletedTrips(UUID customerId);
    com.driverapp.bookingservice.dto.response.TripPriceDto getTripPrice(String tripId);
    Trip getTripById(String tripId);
    Trip getCurrentTrip(UUID customerId);
    java.util.Map<String, Object> simulateMatchingForDriver(UUID driverUserId, double lat, double lng, com.driverapp.bookingservice.models.enums.VehicleType vehicleType);
}
