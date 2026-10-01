package com.driverapp.bookingservice.models;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@NoArgsConstructor
@Document(collection = "restaurants")
public class Restaurant {
    @Id
    private String id;

    private String name;
    private String locationAddress;
    private double locationLatitude;
    private double locationLongitude;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}