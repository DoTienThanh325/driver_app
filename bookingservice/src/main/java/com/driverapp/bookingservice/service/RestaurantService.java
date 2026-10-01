package com.driverapp.bookingservice.service;

import java.util.UUID;

import com.driverapp.bookingservice.dto.request.RestaurantRequest;

public interface RestaurantService {
    public void createRestaurant(RestaurantRequest request);

    public void updateRestaurant(UUID id, RestaurantRequest request);

    public void deleteRestaurant(UUID id);

}
