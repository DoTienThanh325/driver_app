package com.driverapp.bookingservice.models;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Builder 
@AllArgsConstructor 
@NoArgsConstructor
@Document(collection = "foods")
public class Food {
    @Id
    private String id;

    private String name;
    private List<FoodOption> options;
    private String restaurantId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}