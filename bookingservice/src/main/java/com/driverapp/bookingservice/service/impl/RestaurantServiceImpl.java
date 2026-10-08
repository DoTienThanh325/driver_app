package com.driverapp.bookingservice.service.impl;

import com.driverapp.bookingservice.dto.request.RestaurantRequest;
import com.driverapp.bookingservice.models.Business;
import com.driverapp.bookingservice.models.Restaurant;
import com.driverapp.bookingservice.models.enums.BusinessRegistrationStatus;
import com.driverapp.bookingservice.repository.BusinessRepository;
import com.driverapp.bookingservice.repository.FoodRepository;
import com.driverapp.bookingservice.repository.RestaurantRepository;
import com.driverapp.bookingservice.service.RestaurantService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RestaurantServiceImpl implements RestaurantService {

    private final RestaurantRepository restaurantRepository;
    private final FoodRepository foodRepository;
    private final BusinessRepository businessRepository;

    @Override
    @Transactional
    public Restaurant createRestaurant(RestaurantRequest request) {
        Restaurant restaurant = Restaurant.builder()
                .name(request.name())
                .locationAddress(request.locationAddress())
                .locationLatitude(request.locationLatitude())
                .locationLongitude(request.locationLongitude())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Restaurant saved = restaurantRepository.save(restaurant);
        log.info("Created restaurant: id={}, name={}", saved.getId(), saved.getName());
        return saved;
    }

    @Override
    @Transactional
    public void updateRestaurant(UUID userId, String restaurantId, RestaurantRequest request) {
        verifyBusinessOwnership(userId, restaurantId);

        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Restaurant not found with id: " + restaurantId));

        // Only update the 4 required fields
        if (request.name() != null && !request.name().isEmpty()) {
            restaurant.setName(request.name());
        }

        if (request.locationAddress() != null && !request.locationAddress().isEmpty()) {
            restaurant.setLocationAddress(request.locationAddress());
        }

        if (request.locationLatitude() != null) {
            restaurant.setLocationLatitude(request.locationLatitude());
        }

        if (request.locationLongitude() != null) {
            restaurant.setLocationLongitude(request.locationLongitude());
        }
        restaurant.setUpdatedAt(LocalDateTime.now());

        restaurantRepository.save(restaurant);
        log.info("Updated restaurant: id={}, userId={}", restaurantId, userId);
    }

    @Override
    @Transactional
    public void deleteRestaurant(UUID userId, String restaurantId) {
        verifyBusinessOwnership(userId, restaurantId);

        if (!restaurantRepository.existsById(restaurantId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Restaurant not found with id: " + restaurantId);
        }

        // Delete all foods belonging to this restaurant
        foodRepository.deleteByRestaurantId(restaurantId);
        log.info("Deleted all foods for restaurant: id={}", restaurantId);

        // Delete restaurant entity
        restaurantRepository.deleteById(restaurantId);
        log.info("Deleted restaurant: id={}, userId={}", restaurantId, userId);
    }

    private void verifyBusinessOwnership(UUID userId, String restaurantId) {
        Business business = businessRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "User does not have an active business registration"));

        if (business.getStatus() != BusinessRegistrationStatus.ACCEPTED) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Business registration is not active (status: " + business.getStatus() + ")");
        }

        if (!restaurantId.equals(business.getRestaurantId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "You do not have permission to manage this restaurant");
        }
    }
}
