package com.driverapp.bookingservice.dto.request;

import java.util.List;

import com.driverapp.bookingservice.models.enums.ShippingType;
import com.driverapp.bookingservice.models.enums.VehicleType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Dùng cho POST /api/trips
 * customerId được lấy từ JWT.sub — không nhận từ body
 * foodId và foodPrice nullable (chỉ bắt buộc khi shippingType = FOOD_DELIVERY)
 */
public record CreateTripRequest(
    double pickUpLatitude,
    double pickUpLongitude,
    @NotBlank String pickUpAddress,

    @NotBlank String destinationAddress,
    double destinationLatitude,
    double destinationLongitude,

    @NotNull ShippingType shippingType,
    @NotNull VehicleType vehicleType,

    @NotNull Double shippFare,

    // Chỉ có khi shippingType = FOOD_DELIVERY
    // Danh sách món ăn chọn mua (chỉ truyền khi shippingType = FOOD_DELIVERY)
    @Valid List<FoodOrderItemRequest> foods
) {}