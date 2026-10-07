package com.driverapp.bookingservice.service.impl;

import com.driverapp.bookingservice.dto.request.CreateFoodRequest;
import com.driverapp.bookingservice.dto.request.FoodOptionRequest;
import com.driverapp.bookingservice.dto.request.UpdateFoodRequest;
import com.driverapp.bookingservice.models.Business;
import com.driverapp.bookingservice.models.Food;
import com.driverapp.bookingservice.models.FoodOption;
import com.driverapp.bookingservice.models.enums.BusinessRegistrationStatus;
import com.driverapp.bookingservice.repository.BusinessRepository;
import com.driverapp.bookingservice.repository.FoodRepository;
import com.driverapp.bookingservice.service.FoodService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FoodServiceImpl implements FoodService {

    private final FoodRepository foodRepository;
    private final BusinessRepository businessRepository;

    // ------------------------------------------------------------------ CREATE
    @Override
    public void createFood(UUID userId, CreateFoodRequest request) {
        String restaurantId = getOwnRestaurantId(userId);

        Food food = Food.builder()
                .name(request.name())
                .restaurantId(restaurantId)
                .options(toOptions(request.options()))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        foodRepository.save(food);
    }

    // ------------------------------------------------------------------ UPDATE
    @Override
    public void updateFood(UUID userId, String id, UpdateFoodRequest request) {
        String restaurantId = getOwnRestaurantId(userId);
        Food food = findOwnFoodOrThrow(id, restaurantId);

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
    public void deleteFood(UUID userId, String id) {
        String restaurantId = getOwnRestaurantId(userId);
        Food food = findOwnFoodOrThrow(id, restaurantId);
        foodRepository.delete(food);
    }

    // ------------------------------------------------------------------ HELPER
    /** Lấy restaurantId từ đơn kinh doanh đã được duyệt của user */
    private String getOwnRestaurantId(UUID userId) {
        Business business = businessRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "Bạn chưa có thông tin kinh doanh"));

        if (business.getStatus() != BusinessRegistrationStatus.ACCEPTED) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Đơn kinh doanh chưa được duyệt hoặc đã bị khóa");
        }
        return business.getRestaurantId();
    }

    /** Món ăn phải tồn tại và thuộc nhà hàng của business hiện tại */
    private Food findOwnFoodOrThrow(String foodId, String restaurantId) {
        Food food = foodRepository.findById(foodId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy món ăn với id: " + foodId));

        if (!restaurantId.equals(food.getRestaurantId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Bạn không có quyền thao tác món ăn này");
        }
        return food;
    }

    private List<FoodOption> toOptions(List<FoodOptionRequest> dtos) {
        return dtos.stream().map(dto -> {
            FoodOption opt = new FoodOption();
            opt.setSize(dto.size());
            opt.setPrice(dto.price());
            return opt;
        }).toList();
    }
}