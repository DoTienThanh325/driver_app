package com.driverapp.bookingservice.dto.response;

import com.driverapp.bookingservice.models.enums.ShippingType;
import com.driverapp.bookingservice.models.enums.TripStatus;
import com.driverapp.bookingservice.models.enums.VehicleType;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO phản hồi lịch sử chuyến đi dành cho tài xế.
 * TUYỆT ĐỐI KHÔNG CHỨA BẤT KỲ TRƯỜNG ID NÀO.
 */
public record DriverTripResponse(
        CustomerProfile customer,
        String pickUpAddress,
        double pickUpLatitude,
        double pickUpLongitude,
        String destinationAddress,
        double destinationLatitude,
        double destinationLongitude,
        ShippingType shippingType,
        VehicleType vehicleType,
        TripFare fare,
        List<FoodItemDetail> foods,
        TripStatus status,
        String cancelReason,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public record CustomerProfile(
            String name,
            String phoneNumber
    ) {}

    public record TripFare(
            double shippingFare,
            Double foodFare,
            double totalFare
    ) {}

    public record FoodItemDetail(
            String foodName,
            String size,
            Integer quantity,
            double price
    ) {
        public FoodItemDetail(String foodName, String size, double price) {
            this(foodName, size, 1, price);
        }
    }
}
