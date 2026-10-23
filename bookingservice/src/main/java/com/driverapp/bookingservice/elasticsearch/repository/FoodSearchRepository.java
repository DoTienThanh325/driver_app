package com.driverapp.bookingservice.elasticsearch.repository;

import com.driverapp.bookingservice.elasticsearch.document.FoodDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FoodSearchRepository extends ElasticsearchRepository<FoodDocument, String> {
    List<FoodDocument> findByRestaurantId(String restaurantId);
    void deleteByRestaurantId(String restaurantId);
}
