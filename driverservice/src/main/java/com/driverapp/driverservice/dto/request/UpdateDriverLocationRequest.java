package com.driverapp.driverservice.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record UpdateDriverLocationRequest(
        @NotNull(message = "Vĩ độ không được để trống")
        @DecimalMin(value = "-90.0", message = "Vĩ độ không hợp lệ")
        @DecimalMax(value = "90.0", message = "Vĩ độ không hợp lệ")
        Double latitude,

        @NotNull(message = "Kinh độ không được để trống")
        @DecimalMin(value = "-180.0", message = "Kinh độ không hợp lệ")
        @DecimalMax(value = "180.0", message = "Kinh độ không hợp lệ")
        Double longitude,

        Double heading, // Hướng di chuyển (0 - 360 độ)
        Double speed    // Tốc độ hiện tại (km/h)
) {}
