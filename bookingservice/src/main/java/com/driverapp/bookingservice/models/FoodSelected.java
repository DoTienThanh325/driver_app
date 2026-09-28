package com.driverapp.bookingservice.models;

import java.util.UUID;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class FoodSelected {
    private UUID foodId;
    private String size;
    private double price;
}
