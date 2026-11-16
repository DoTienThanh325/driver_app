package com.driverapp.bookingservice.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class FoodSearchResponse {
    private String id;
    private String name;
    private String restaurantId;
    private String restaurantName;
    private String restaurantAddress;
    private Double distanceKm; // Khoảng cách từ khách hàng đến quán ăn (km)
    private List<OptionItem> options;

    @Getter
    @Builder
    public static class OptionItem {
        private String size;
        private double price;
        private String imageUrl;
    }
}
