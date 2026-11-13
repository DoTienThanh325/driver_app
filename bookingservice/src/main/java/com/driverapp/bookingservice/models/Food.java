package com.driverapp.bookingservice.models;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Builder 
@AllArgsConstructor 
@NoArgsConstructor
@Document(collection = "foods")
@CompoundIndexes({
    @CompoundIndex(name = "restaurant_createdAt_idx", def = "{'restaurantId': 1, 'createdAt': -1}"),
    @CompoundIndex(name = "options_price_idx", def = "{'options.price': 1}"),
    @CompoundIndex(name = "createdAt_id_idx", def = "{'createdAt': -1, '_id': -1}")
})
public class Food {
    @Id
    private String id;

    private String name;
    private List<FoodOption> options;
    private String restaurantId;

    private Double averageRating;
    private Integer totalReviews;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}