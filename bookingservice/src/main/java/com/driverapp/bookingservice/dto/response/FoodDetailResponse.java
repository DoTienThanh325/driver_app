package com.driverapp.bookingservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodDetailResponse {
    private FoodInfo food;
    private RestaurantInfo restaurant;
    private List<VoucherInfo> vouchers;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FoodInfo {
        private String id;
        private String name;
        private Double averageRating;
        private Integer totalReviews;
        private List<OptionItem> options;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptionItem {
        private String size;
        private double price;
        private String imageUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RestaurantInfo {
        private String id;
        private String name;
        private String locationAddress;
        private double locationLatitude;
        private double locationLongitude;
        private Double rating;
        private Double distanceKm;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VoucherInfo {
        private String id;
        private String code;
        private String title;
        private Double discount;
        private Double maxDiscount;
        private Double minValue;
        private String type;
        private LocalDateTime expiredAt;
    }
}
