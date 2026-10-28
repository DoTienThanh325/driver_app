package com.driverapp.bookingservice.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
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

    // Bán kính tìm kiếm (mặc định 5.0km nếu không truyền)
    @Builder.Default
    private Double radiusKm = 5.0;

    // Phân trang
    @Builder.Default
    private int page = 0;

    @Builder.Default
    private int size = 20;
}
