package com.driverapp.bookingservice.service;

import com.driverapp.bookingservice.dto.request.CancelTripRequest;
import com.driverapp.bookingservice.dto.request.CreateTripRequest;
import com.driverapp.bookingservice.dto.request.UpdateTripStatusRequest;
import com.driverapp.bookingservice.dto.response.AcceptTripResponse;
import com.driverapp.bookingservice.dto.response.CreateTripResponse;

import java.util.UUID;

public interface TripService {
    CreateTripResponse createTrip(UUID customerId, CreateTripRequest request);
    AcceptTripResponse acceptTrip(String tripId, UUID driverUserId);
    void updateTripStatus(UUID driverUserId, UpdateTripStatusRequest request);
    void cancelTripByCustomer(String tripId, UUID customerId, CancelTripRequest request);
    long countCompletedTrips(UUID customerId);
}