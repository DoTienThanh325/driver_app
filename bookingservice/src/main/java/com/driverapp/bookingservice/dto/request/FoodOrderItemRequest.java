package com.driverapp.bookingservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record FoodOrderItemRequest(
        @NotNull(message = "foodId không được để trống") String foodId,

        @NotBlank(message = "size không được để trống") String size,

        @Positive(message = "Số lượng phải lớn hơn 0") Integer quantity // Số lượng món (mặc định = 1 nếu không truyền)
) {
    public int getEffectiveQuantity() {
        return (quantity != null && quantity > 0) ? quantity : 1;
    }
}