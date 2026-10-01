package com.driverapp.bookingservice.models;


import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class FoodSelected {
    private String foodId;
    private String size;
    private double price;
}
