package com.driverapp.bookingservice.service.impl;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.driverapp.bookingservice.dto.request.RestaurantRequest;
import com.driverapp.bookingservice.models.Restaurant;
import com.driverapp.bookingservice.repository.FoodRepository;
import com.driverapp.bookingservice.repository.RestaurantRepository;
import com.driverapp.bookingservice.service.RestaurantService;

import lombok.RequiredArgsConstructor;

@Service 
@RequiredArgsConstructor 
public class RestaurantServiceImpl implements RestaurantService {

    private final RestaurantRepository restaurantRepository;
    private final FoodRepository foodRepository;
    

    @Override
    public void createRestaurant(RestaurantRequest request) {
        LocalDateTime now = LocalDateTime.now();
        Restaurant restaurant = Restaurant.builder()
                .id(UUID.randomUUID())
                .name(request.name())
                .locationAddress(request.locationAddress())
                .locationLatitude(Double.parseDouble(request.locationLatitude()))
                .locationLongitude(Double.parseDouble(request.locationLongitude()))
                .createdAt(now)
                .updatedAt(now)
                .build();
        restaurantRepository.save(restaurant);
    }

    @Override
    public void updateRestaurant(UUID id, RestaurantRequest request) {
        Restaurant restaurant = restaurantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy nhà hàng với ID: " + id
                ));
        restaurant.setName(request.name());
        restaurant.setLocationAddress(request.locationAddress());
        restaurant.setLocationLatitude(Double.parseDouble(request.locationLatitude()));
        restaurant.setLocationLongitude(Double.parseDouble(request.locationLongitude()));
        restaurant.setUpdatedAt(LocalDateTime.now());
        restaurantRepository.save(restaurant);
    }

    @Override
    public void deleteRestaurant(UUID id) {
        foodRepository.deleteByRestaurantId(id);
        restaurantRepository.deleteById(id);
    }
}
