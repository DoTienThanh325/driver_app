package com.driverapp.bookingservice.service.impl;

import com.driverapp.bookingservice.client.DriverServiceClient;
import com.driverapp.bookingservice.client.NotificationClient;
import com.driverapp.bookingservice.dto.request.CreateNotificationRequest;
import com.driverapp.bookingservice.dto.request.CreateTripRequest;
import com.driverapp.bookingservice.dto.request.FoodOrderItemRequest;
import com.driverapp.bookingservice.dto.response.AcceptTripResponse;
import com.driverapp.bookingservice.dto.response.CreateTripResponse;
import com.driverapp.bookingservice.models.Food;
import com.driverapp.bookingservice.models.FoodOption;
import com.driverapp.bookingservice.models.FoodSelected;
import com.driverapp.bookingservice.models.Trip;
import com.driverapp.bookingservice.models.enums.ShippingType;
import com.driverapp.bookingservice.models.enums.TripStatus;
import com.driverapp.bookingservice.repository.FoodRepository;
import com.driverapp.bookingservice.repository.TripRepository;
import com.driverapp.bookingservice.service.TripService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TripServiceImpl implements TripService {

    /** Giá cước ship cố định (tạm thời fix cứng) */
    private static final double FIXED_SHIPP_FARE = 25_000.0;

    private final TripRepository tripRepository;
    private final FoodRepository foodRepository;
    private final NotificationClient notificationClient;
    private final DriverServiceClient driverServiceClient;
    private final MongoTemplate mongoTemplate;

    @Override
    public CreateTripResponse createTrip(UUID customerId, CreateTripRequest request) {

        // ── Kiểm tra điều kiện: Cuốc xe trước đó phải kết thúc hoặc bị hủy ──
        tripRepository.findTopByCustomerIdOrderByCreatedAtDesc(customerId)
                .ifPresent(lastTrip -> {
                    if (lastTrip.getStatus() != TripStatus.COMPLETED
                            && lastTrip.getStatus() != TripStatus.CANCELLED) {
                        throw new ResponseStatusException(
                                HttpStatus.CONFLICT,
                                "Bạn đang có chuyến đi chưa hoàn tất (mã: " + lastTrip.getId()
                                        + ", trạng thái: " + lastTrip.getStatus()
                                        + "). Cuốc xe trước đó phải kết thúc hoặc bị hủy trước khi đặt chuyến mới."
                        );
                    }
                });

        // ── Validate food nếu là FOOD_DELIVERY ──────────────────────────────
        List<FoodSelected> foodSelectedList = null;
        Double totalFoodPrice = null;

        // Xử lý đơn đặt đồ ăn (nhiều món)
        if (request.shippingType() == ShippingType.FOOD_DELIVERY) {
            if (request.foods() == null || request.foods().isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Danh sách món ăn (foods) không được để trống khi đặt FOOD_DELIVERY");
            }
            foodSelectedList = new ArrayList<>();
            double calculatedTotalPrice = 0.0;
            for (FoodOrderItemRequest item : request.foods()) {
                // 1. Kiểm tra món ăn tồn tại trong DB
                Food food = foodRepository.findById(item.foodId())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Không tìm thấy món ăn với id: " + item.foodId()));
                // 2. Kiểm tra size và lấy giá từ options trong DB
                FoodOption matchedOption = food.getOptions().stream()
                        .filter(opt -> opt.getSize().equalsIgnoreCase(item.size()))
                        .findFirst()
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.BAD_REQUEST,
                                "Món '" + food.getName() + "' không có size: " + item.size()));
                int qty = item.getEffectiveQuantity();
                double itemTotalPrice = matchedOption.getPrice() * qty;
                calculatedTotalPrice += itemTotalPrice;
                // 3. Thêm vào danh sách FoodSelected
                FoodSelected selected = new FoodSelected();
                selected.setFoodId(food.getId().toString());
                selected.setSize(matchedOption.getSize());
                selected.setPrice(itemTotalPrice);
                foodSelectedList.add(selected);
            }
            totalFoodPrice = calculatedTotalPrice;
        }

        // ── Cài đặt shippFare ────────────────────────────────────────────
        double shippFare = request.shippFare() != null && request.shippFare() > 0
                ? request.shippFare()
                : FIXED_SHIPP_FARE;

        // ── Tạo Trip ─────────────────────────────────────────────────────────
        Trip trip = Trip.builder()
                .customerId(customerId)
                .pickUpLatitude(request.pickUpLatitude())
                .pickUpLongitude(request.pickUpLongitude())
                .pickUpAddress(request.pickUpAddress())
                .destinationAddress(request.destinationAddress())
                .destinationLatitude(request.destinationLatitude())
                .destinationLongitude(request.destinationLongitude())
                .shippingType(request.shippingType())
                .vehicleType(request.vehicleType())
                .foodSelectedsList(foodSelectedList)
                .totalFoodPrice(totalFoodPrice)
                .shippFare(shippFare)
                .status(TripStatus.SEARCHING_DRIVER)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Trip saved = tripRepository.save(trip);

        // ── Gọi Notification Service ─────────────────────────────────────────
        notificationClient.createNotification(new CreateNotificationRequest(
                "Chuyến đi đã được tạo",
                "Hệ thống đang tìm tài xế cho chuyến đi của bạn. Vui lòng chờ trong giây lát.",
                customerId));

        return new CreateTripResponse("Tạo chuyến thành công", saved.getId());
    }

    // ────────────────────────────────────────────── ACCEPT TRIP (MỚI)
    @Override
    public AcceptTripResponse acceptTrip(String tripId, UUID driverUserId) {

            // ── BƯỚC 1: Lấy đúng driverId từ driver-service qua driverUserId ──
            // Hàm này đồng thời kiểm tra driver có tồn tại, APPROVED và đang AVAILABLE
            // không
            UUID actualDriverId = driverServiceClient.getAvailableDriverId(driverUserId);

            // ── BƯỚC 2: Cập nhật có điều kiện (Atomic update bằng Mongo findAndModify) ──
            Query query = new Query(Criteria.where("id").is(tripId)
                            .and("status").is(TripStatus.SEARCHING_DRIVER.name()));

            Update update = new Update()
                            .set("driverId", actualDriverId) // ✅ ĐÃ GÁN ĐÚNG ID BẢNG DRIVERS
                            .set("status", TripStatus.DRIVER_ASSIGNED.name())
                            .set("updatedAt", LocalDateTime.now());

            Trip updated = mongoTemplate.findAndModify(
                            query,
                            update,
                            org.springframework.data.mongodb.core.FindAndModifyOptions.options().returnNew(true),
                            Trip.class);

            if (updated == null) {
                    Trip existing = tripRepository.findById(tripId)
                                    .orElseThrow(() -> new ResponseStatusException(
                                                    HttpStatus.NOT_FOUND,
                                                    "Không tìm thấy chuyến đi với id: " + tripId));
                    throw new ResponseStatusException(
                                    HttpStatus.CONFLICT,
                                    "Chuyến đi đã được tài xế khác nhận. Status hiện tại: " + existing.getStatus());
            }

            // ── BƯỚC 3: Chuyển availability của driverId sang ON_TRIP ──
            driverServiceClient.setDriverOnTrip(actualDriverId);

            // ── BƯỚC 4: Bắn thông báo cho Customer ──
            notificationClient.createNotification(new CreateNotificationRequest(
                            "Tài xế đã nhận chuyến",
                            "Tài xế đang trên đường đến đón bạn. Mã chuyến: " + tripId,
                            updated.getCustomerId()));

            return new AcceptTripResponse(
                            updated.getId(),
                            updated.getStatus().name(),
                            "Nhận chuyến thành công");
    }
}