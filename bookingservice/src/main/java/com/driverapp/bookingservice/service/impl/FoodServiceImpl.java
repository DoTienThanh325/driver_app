package com.driverapp.bookingservice.service.impl;

import com.driverapp.bookingservice.dto.request.CreateFoodRequest;
import com.driverapp.bookingservice.dto.request.FoodOptionRequest;
import com.driverapp.bookingservice.dto.request.UpdateFoodRequest;
import com.driverapp.bookingservice.models.Food;
import com.driverapp.bookingservice.models.FoodOption;
import com.driverapp.bookingservice.repository.FoodRepository;
import com.driverapp.bookingservice.repository.RestaurantRepository;
import com.driverapp.bookingservice.service.FoodService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FoodServiceImpl implements FoodService {

    private final FoodRepository foodRepository;
    private final RestaurantRepository restaurantRepository;

    // ------------------------------------------------------------------ CREATE
    @Override
    public void createFood(CreateFoodRequest request) {
        // Kiểm tra restaurantId tồn tại
        boolean restaurantExists = restaurantRepository
                .existsById(request.restaurantId());

        if (!restaurantExists) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy nhà hàng với id: " + request.restaurantId());
        }

        Food food = Food.builder()
                .name(request.name())
                .restaurantId(request.restaurantId())
                .options(toOptions(request.options()))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        foodRepository.save(food);
    }

    // ------------------------------------------------------------------ UPDATE
    @Override
    public void updateFood(String id, UpdateFoodRequest request) {
        Food food = foodRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy món ăn với id: " + id));

        // Sửa tên nếu được truyền vào
        if (request.name() != null && !request.name().isBlank()) {
            food.setName(request.name());
        }

        // Merge options nếu được truyền vào
        if (request.options() != null && !request.options().isEmpty()) {
            List<FoodOption> current = food.getOptions();
            if (current == null) {
                current = new ArrayList<>();
            }
            for (FoodOptionRequest incoming : request.options()) {
                // Tìm option có cùng size → cập nhật price; không có → thêm mới
                boolean found = false;
                for (FoodOption existing : current) {
                    if (existing.getSize().equalsIgnoreCase(incoming.size())) {
                        existing.setPrice(incoming.price());
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    FoodOption newOption = new FoodOption();
                    newOption.setSize(incoming.size());
                    newOption.setPrice(incoming.price());
                    current.add(newOption);
                }
            }
            food.setOptions(current);
        }

        food.setUpdatedAt(LocalDateTime.now());
        foodRepository.save(food);
    }

    // ------------------------------------------------------------------ DELETE
    @Override
    public void deleteFood(String id) {
        if (!foodRepository.existsById(id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy món ăn với id: " + id);
        }
        foodRepository.deleteById(id.toString());
    }

    // ------------------------------------------------------------------ HELPER
    private List<FoodOption> toOptions(List<FoodOptionRequest> dtos) {
        return dtos.stream().map(dto -> {
            FoodOption opt = new FoodOption();
            opt.setSize(dto.size());
            opt.setPrice(dto.price());
            return opt;
        }).toList();
    }
}