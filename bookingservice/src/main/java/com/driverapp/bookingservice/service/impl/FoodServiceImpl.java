package com.driverapp.bookingservice.service.impl;

import com.driverapp.bookingservice.client.PaymentServiceClient;
import com.driverapp.bookingservice.dto.request.CreateFoodRequest;
import com.driverapp.bookingservice.dto.request.FoodOptionRequest;
import com.driverapp.bookingservice.dto.request.UpdateFoodRequest;
import com.driverapp.bookingservice.dto.response.FoodDetailResponse;
import com.driverapp.bookingservice.dto.response.FoodListResponse;
import com.driverapp.bookingservice.models.Business;
import com.driverapp.bookingservice.models.Food;
import com.driverapp.bookingservice.models.FoodOption;
import com.driverapp.bookingservice.models.Restaurant;
import com.driverapp.bookingservice.models.enums.BusinessRegistrationStatus;
import com.driverapp.bookingservice.repository.BusinessRepository;
import com.driverapp.bookingservice.repository.FoodRepository;
import com.driverapp.bookingservice.repository.RestaurantRepository;
import com.driverapp.bookingservice.service.FoodSearchService;
import com.driverapp.bookingservice.service.FoodService;
import com.driverapp.bookingservice.storage.FoodImageStorage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FoodServiceImpl implements FoodService {

    private final FoodRepository foodRepository;
    private final RestaurantRepository restaurantRepository;
    private final BusinessRepository businessRepository;
    private final FoodSearchService foodSearchService;
    private final FoodImageStorage foodImageStorage;
    private final PaymentServiceClient paymentServiceClient;

    // ------------------------------------------------------------------ CREATE
    @Override
    public String createFood(UUID userId, CreateFoodRequest request, List<MultipartFile> images) {
        String restaurantId = getOwnRestaurantId(userId);

        if (images == null || images.size() != request.options().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Số lượng file ảnh (" + (images == null ? 0 : images.size()) +
                    ") phải tương ứng chính xác với số lượng option (" + request.options().size() + ")");
        }

        for (MultipartFile image : images) {
            foodImageStorage.validate(image);
        }

        String foodId = new ObjectId().toHexString();

        List<FoodOption> options = new ArrayList<>();
        try {
            for (int i = 0; i < request.options().size(); i++) {
                FoodOptionRequest optReq = request.options().get(i);
                MultipartFile imageFile = images.get(i);

                int imageIndex = i + 1; // image_1, image_2, ...
                String imageUrl = foodImageStorage.uploadFoodOptionImage(foodId, imageIndex, imageFile);

                FoodOption opt = new FoodOption();
                opt.setSize(optReq.size());
                opt.setPrice(optReq.price());
                opt.setImageUrl(imageUrl);
                options.add(opt);
            }

            Food food = Food.builder()
                    .id(foodId)
                    .name(request.name())
                    .restaurantId(restaurantId)
                    .options(options)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            Food savedFood = foodRepository.save(food);
            foodSearchService.syncFoodToElasticsearch(savedFood.getId());
            return savedFood.getId();
        } catch (Exception e) {
            log.error("Lỗi khi tạo món ăn, bắt đầu dọn dẹp file trên MinIO cho foodId: {}", foodId, e);
            foodImageStorage.deleteFolder(foodId);
            if (e instanceof ResponseStatusException rse) {
                throw rse;
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể lưu thông tin món ăn", e);
        }
    }

    // ------------------------------------------------------------------ UPDATE
    @Override
    public void updateFood(UUID userId, String id, UpdateFoodRequest request, List<MultipartFile> images) {
        String restaurantId = getOwnRestaurantId(userId);
        Food food = findOwnFoodOrThrow(id, restaurantId);

        // Sửa tên nếu được truyền vào
        if (request != null && request.name() != null && !request.name().isBlank()) {
            food.setName(request.name());
        }

        // Merge options và cập nhật ảnh nếu được truyền vào
        if (request != null && request.options() != null && !request.options().isEmpty()) {
            List<FoodOption> current = food.getOptions();
            if (current == null) {
                current = new ArrayList<>();
            }

            // Tìm index ảnh lớn nhất hiện có trong các options
            int maxIndex = 0;
            for (FoodOption opt : current) {
                if (opt.getImageUrl() != null) {
                    int idx = extractImageIndex(opt.getImageUrl());
                    if (idx > maxIndex) {
                        maxIndex = idx;
                    }
                }
            }

            for (int i = 0; i < request.options().size(); i++) {
                FoodOptionRequest incoming = request.options().get(i);
                MultipartFile imageFile = resolveImageFile(incoming, i, request.options().size(), images);

                // Tìm option đã tồn tại theo size
                FoodOption existing = null;
                for (FoodOption opt : current) {
                    if (opt.getSize().equalsIgnoreCase(incoming.size())) {
                        existing = opt;
                        break;
                    }
                }

                if (existing != null) {
                    existing.setPrice(incoming.price());
                    if (imageFile != null && !imageFile.isEmpty()) {
                        foodImageStorage.validate(imageFile);
                        int targetIndex = extractImageIndex(existing.getImageUrl());
                        if (targetIndex <= 0) {
                            targetIndex = ++maxIndex;
                        }
                        String oldUrl = existing.getImageUrl();
                        String newUrl = foodImageStorage.uploadFoodOptionImage(food.getId(), targetIndex, imageFile);
                        existing.setImageUrl(newUrl);
                        if (oldUrl != null && !oldUrl.equals(newUrl)) {
                            foodImageStorage.deleteQuietly(oldUrl);
                        }
                    }
                } else {
                    FoodOption newOption = new FoodOption();
                    newOption.setSize(incoming.size());
                    newOption.setPrice(incoming.price());
                    if (imageFile != null && !imageFile.isEmpty()) {
                        foodImageStorage.validate(imageFile);
                        int targetIndex = ++maxIndex;
                        String newUrl = foodImageStorage.uploadFoodOptionImage(food.getId(), targetIndex, imageFile);
                        newOption.setImageUrl(newUrl);
                    }
                    current.add(newOption);
                }
            }
            food.setOptions(current);
        }

        food.setUpdatedAt(LocalDateTime.now());
        foodRepository.save(food);
        foodSearchService.syncFoodToElasticsearch(food.getId());
    }

    // ------------------------------------------------------------------ DELETE
    @Override
    public void deleteFood(UUID userId, String id) {
        String restaurantId = getOwnRestaurantId(userId);
        Food food = findOwnFoodOrThrow(id, restaurantId);
        foodRepository.delete(food);
        foodSearchService.deleteFoodFromElasticsearch(id);
        foodImageStorage.deleteFolder(id);
    }

    private MultipartFile resolveImageFile(FoodOptionRequest incoming, int index, int totalOptions, List<MultipartFile> images) {
        if (images == null || images.isEmpty()) {
            return null;
        }
        if (incoming.imageIndex() != null) {
            int idx = incoming.imageIndex();
            if (idx >= 0 && idx < images.size()) {
                return images.get(idx);
            }
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "imageIndex " + idx + " không hợp lệ so với số lượng file ảnh (" + images.size() + ")");
        }
        if (images.size() == totalOptions && index < images.size()) {
            return images.get(index);
        }
        return null;
    }

    private int extractImageIndex(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return -1;
        }
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("image_(\\d+)").matcher(imageUrl);
        if (matcher.find()) {
            try {
                return Integer.parseInt(matcher.group(1));
            } catch (NumberFormatException ignored) {}
        }
        return -1;
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

    // ------------------------------------------------------------------ GET ALL FOODS
    @Override
    public Page<FoodListResponse> getAllFoods(String restaurantId, Pageable pageable) {
        Page<Food> foodPage = (restaurantId != null && !restaurantId.isBlank())
                ? foodRepository.findByRestaurantId(restaurantId, pageable)
                : foodRepository.findAll(pageable);

        if (foodPage.isEmpty()) {
            return Page.empty(pageable);
        }

        // Tối ưu N+1: Lấy toàn bộ restaurantId của trang hiện tại và query 1 lần
        Set<String> restaurantIds = foodPage.getContent().stream()
                .map(Food::getRestaurantId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<String, Restaurant> restaurantMap = restaurantRepository.findAllById(restaurantIds)
                .stream()
                .collect(Collectors.toMap(Restaurant::getId, Function.identity(), (k1, k2) -> k1));

        List<FoodListResponse> content = foodPage.getContent().stream().map(food -> {
            Restaurant res = restaurantMap.get(food.getRestaurantId());
            String restaurantName = res != null ? res.getName() : null;

            double minPrice = 0.0;
            double maxPrice = 0.0;
            String thumbnailUrl = null;

            if (food.getOptions() != null && !food.getOptions().isEmpty()) {
                minPrice = food.getOptions().stream().mapToDouble(FoodOption::getPrice).min().orElse(0.0);
                maxPrice = food.getOptions().stream().mapToDouble(FoodOption::getPrice).max().orElse(0.0);
                thumbnailUrl = food.getOptions().get(0).getImageUrl();
            }

            List<FoodListResponse.OptionItem> optionItems = food.getOptions() == null ? Collections.emptyList() :
                    food.getOptions().stream().map(opt -> FoodListResponse.OptionItem.builder()
                            .size(opt.getSize())
                            .price(opt.getPrice())
                            .imageUrl(opt.getImageUrl())
                            .build()
                    ).toList();

            return FoodListResponse.builder()
                    .id(food.getId())
                    .name(food.getName())
                    .restaurantId(food.getRestaurantId())
                    .restaurantName(restaurantName)
                    .minPrice(minPrice)
                    .maxPrice(maxPrice)
                    .averageRating(food.getAverageRating() != null ? food.getAverageRating() : 5.0)
                    .totalReviews(food.getTotalReviews() != null ? food.getTotalReviews() : 0)
                    .thumbnailUrl(thumbnailUrl)
                    .options(optionItems)
                    .createdAt(food.getCreatedAt())
                    .build();
        }).toList();

        return new PageImpl<>(content, pageable, foodPage.getTotalElements());
    }

    // ------------------------------------------------------------------ GET FOOD DETAIL
    @Override
    public FoodDetailResponse getFoodDetail(String id, Double userLat, Double userLng) {
        Food food = foodRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy món ăn với ID: " + id));

        Restaurant restaurant = null;
        if (food.getRestaurantId() != null) {
            restaurant = restaurantRepository.findById(food.getRestaurantId()).orElse(null);
        }

        Double distanceKm = null;
        if (restaurant != null && userLat != null && userLng != null
                && restaurant.getLocationLatitude() != 0.0 && restaurant.getLocationLongitude() != 0.0) {
            distanceKm = calculateDistance(userLat, userLng, restaurant.getLocationLatitude(), restaurant.getLocationLongitude());
            distanceKm = Math.round(distanceKm * 100.0) / 100.0;
        }

        // Lấy voucher nhà hàng từ paymentservice
        List<FoodDetailResponse.VoucherInfo> voucherInfos = Collections.emptyList();
        if (restaurant != null && restaurant.getId() != null) {
            List<PaymentServiceClient.RestaurantVoucherDto> vouchers = paymentServiceClient.getRestaurantVouchers(restaurant.getId());
            if (vouchers != null && !vouchers.isEmpty()) {
                voucherInfos = vouchers.stream().map(v -> FoodDetailResponse.VoucherInfo.builder()
                        .id(v.getId())
                        .discount(v.getDiscount())
                        .maxDiscount(v.getMaxDiscount())
                        .minValue(v.getMinValue())
                        .type(v.getType())
                        .expiredAt(v.getExpiredAt())
                        .build()
                ).toList();
            }
        }

        List<FoodDetailResponse.OptionItem> optionItems = food.getOptions() == null ? Collections.emptyList() :
                food.getOptions().stream().map(opt -> FoodDetailResponse.OptionItem.builder()
                        .size(opt.getSize())
                        .price(opt.getPrice())
                        .imageUrl(opt.getImageUrl())
                        .build()
                ).toList();

        FoodDetailResponse.FoodInfo foodInfo = FoodDetailResponse.FoodInfo.builder()
                .id(food.getId())
                .name(food.getName())
                .averageRating(food.getAverageRating() != null ? food.getAverageRating() : 5.0)
                .totalReviews(food.getTotalReviews() != null ? food.getTotalReviews() : 0)
                .options(optionItems)
                .createdAt(food.getCreatedAt())
                .build();

        FoodDetailResponse.RestaurantInfo restaurantInfo = null;
        if (restaurant != null) {
            restaurantInfo = FoodDetailResponse.RestaurantInfo.builder()
                    .id(restaurant.getId())
                    .name(restaurant.getName())
                    .locationAddress(restaurant.getLocationAddress())
                    .locationLatitude(restaurant.getLocationLatitude())
                    .locationLongitude(restaurant.getLocationLongitude())
                    .rating(restaurant.getRating() != null ? restaurant.getRating() : 5.0)
                    .distanceKm(distanceKm)
                    .build();
        }

        return FoodDetailResponse.builder()
                .food(foodInfo)
                .restaurant(restaurantInfo)
                .vouchers(voucherInfos)
                .build();
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}