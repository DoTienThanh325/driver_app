package com.driverapp.bookingservice.dto.response;

import com.driverapp.bookingservice.models.FoodSelected;
import com.driverapp.bookingservice.models.Trip;
import com.driverapp.bookingservice.models.enums.ShippingType;
import com.driverapp.bookingservice.models.enums.TripStatus;
import com.driverapp.bookingservice.models.enums.VehicleType;
import java.util.List;

public record DriverCurrentTripResponse(TripSummary currentTrip, TripSummary queuedTrip) {
    public record TripSummary(
            String id,
            TripStatus status,
            ShippingType shippingType,
            VehicleType vehicleType,
            String pickUpAddress,
            double pickUpLatitude,
            double pickUpLongitude,
            String destinationAddress,
            double destinationLatitude,
            double destinationLongitude,
            double shippFare,
            Double totalFoodPrice,
            List<FoodSelected> foods
    ) {
        public static TripSummary from(Trip trip) {
            return new TripSummary(
                    trip.getId(), trip.getStatus(), trip.getShippingType(), trip.getVehicleType(),
                    trip.getPickUpAddress(), trip.getPickUpLatitude(), trip.getPickUpLongitude(),
                    trip.getDestinationAddress(), trip.getDestinationLatitude(), trip.getDestinationLongitude(),
                    trip.getShippFare(), trip.getTotalFoodPrice(),
                    trip.getFoodSelectedsList() == null ? List.of() : trip.getFoodSelectedsList());
        }
    }
}
