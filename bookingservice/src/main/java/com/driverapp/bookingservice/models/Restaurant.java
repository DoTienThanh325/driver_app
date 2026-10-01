package com.driverapp.bookingservice.models;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Document(collection = "restaurants")
public class Restaurant {
    @Id
    private UUID id;

    private String name;
    private String locationAddress;
    private double locationLatitude;
    private double locationLongitude;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}