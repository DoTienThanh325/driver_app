package com.driverapp.bookingservice.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FoodSearchRequest {
    // Tên món ăn cần tìm kiếm (VD: "cơm gà", "bún bò", "trà sữa")
    private String name;

    // Tọa độ người dùng - dùng để SẮP XẾP danh sách từ gần đến xa
    @DecimalMin(value = "-90.0", message = "Latitude không hợp lệ")
    @DecimalMax(value = "90.0", message = "Latitude không hợp lệ")
    private Double latitude;

    @DecimalMin(value = "-180.0", message = "Longitude không hợp lệ")
    @DecimalMax(value = "180.0", message = "Longitude không hợp lệ")
    private Double longitude;

    // Phân trang
    private int page = 0;
    private int size = 20;
}
