package com.driverapp.bookingservice.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FoodSelected {
    private String foodId;
    private String foodName;
    private String size;
    private Integer quantity;
    private double price;
}

