package com.driverapp.bookingservice.models;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@NoArgsConstructor
@Document(collection = "foods")
public class Food {
    @Id
    private UUID id;

    private String name;
    private List<FoodOption> options;
    private UUID restaurantId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}