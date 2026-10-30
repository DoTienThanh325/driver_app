package com.driverapp.bookingservice.service.impl;

import com.driverapp.bookingservice.client.DriverServiceClient;
import com.driverapp.bookingservice.client.NotificationClient;
import com.driverapp.bookingservice.dto.request.CancelTripRequest;
import com.driverapp.bookingservice.dto.request.CreateNotificationRequest;
import com.driverapp.bookingservice.dto.request.CreateTripRequest;
import com.driverapp.bookingservice.dto.request.FoodOrderItemRequest;
import com.driverapp.bookingservice.dto.request.UpdateTripStatusRequest;
import com.driverapp.bookingservice.dto.response.AcceptTripResponse;
import com.driverapp.bookingservice.dto.response.CreateTripResponse;
import com.driverapp.bookingservice.models.Food;
import com.driverapp.bookingservice.models.FoodOption;
import com.driverapp.bookingservice.models.FoodSelected;
import com.driverapp.bookingservice.models.MatchingOffer;
import com.driverapp.bookingservice.models.Trip;
import com.driverapp.bookingservice.models.enums.MatchingOfferStatus;
import com.driverapp.bookingservice.models.enums.ShippingType;
import com.driverapp.bookingservice.models.enums.TripStatus;
import com.driverapp.bookingservice.repository.FoodRepository;
import com.driverapp.bookingservice.repository.MatchingOfferRepository;
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
        private final com.driverapp.bookingservice.client.PaymentServiceClient paymentServiceClient;
        private final MongoTemplate mongoTemplate;
        private final com.driverapp.bookingservice.publisher.TripEventPublisher tripEventPublisher;
        private final MatchingOfferRepository matchingOfferRepository;
        private final com.driverapp.bookingservice.repository.MatchingOfferLogRepository matchingOfferLogRepository;


        @Override
        public CreateTripResponse createTrip(UUID customerId, CreateTripRequest request) {

                // ── Kiểm tra điều kiện: Cuốc xe trước đó phải kết thúc hoặc bị hủy ──
                // Cho phep tao cuoc moi neu cuoc cu khong con tim tai xe
                tripRepository.findTopByCustomerIdOrderByCreatedAtDesc(customerId)
                                .ifPresent(lastTrip -> {
                                        if (lastTrip.getStatus() == TripStatus.REQUESTED
                                                        || lastTrip.getStatus() == TripStatus.SEARCHING_DRIVER) {
                                                throw new ResponseStatusException(
                                                                HttpStatus.CONFLICT,
                                                                "Dang co chuyen di tim tai xe");
                                        }
                                });
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
                                                                "Món '" + food.getName() + "' không có size: "
                                                                                + item.size()));
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
                                .status(TripStatus.REQUESTED)  // Phase 2: REQUESTED, Matching Worker sẽ chuyển sang SEARCHING_DRIVER
                                .createdAt(LocalDateTime.now())
                                .updatedAt(LocalDateTime.now())
                                .build();

                Trip saved = tripRepository.save(trip);

                // ── Gọi Notification Service ─────────────────────────────────────────
                notificationClient.createNotification(new CreateNotificationRequest(
                                "Chuyến đi đã được tạo",
                                "Hệ thống đang tìm tài xế cho chuyến đi của bạn. Vui lòng chờ trong giây lát.",
                                customerId));

                // ── Phát sự kiện trip.created (Matching Worker sẽ nhận và bắt đầu tìm tài xế) ──
                double foodPriceVal = saved.getTotalFoodPrice() != null ? saved.getTotalFoodPrice() : 0.0;
                java.math.BigDecimal totalAmt = java.math.BigDecimal.valueOf(saved.getShippFare() + foodPriceVal);

                tripEventPublisher.publishTripCreated(com.driverapp.bookingservice.event.TripEventPayload.builder()
                                .tripId(saved.getId())
                                .customerId(customerId.toString())
                                .driverId(null)
                                .tripStatus(TripStatus.REQUESTED.name())
                                .paymentMethod("PAY_DIRECTLY")
                                .totalAmount(totalAmt)
                                .pickupAddress(saved.getPickUpAddress())
                                .dropoffAddress(saved.getDestinationAddress())
                                .build());

                return new CreateTripResponse("Tạo chuyến thành công", saved.getId());
        }

        // ────────────────────────────────────────────── ACCEPT TRIP (MỚI)
        @Override
        public AcceptTripResponse acceptTrip(String tripId, UUID driverUserId) {

                // ── BƯỚC 1: Dùng trực tiếp driverUserId làm driverId ──
                // Kiểm tra driver có tồn tại, APPROVED và đang AVAILABLE
                driverServiceClient.checkDriverAvailable(driverUserId);

                // Kiểm tra xem lượt nhận này có phải là cuốc gối đầu (Back-to-Back) không
                boolean isB2B = matchingOfferRepository.findByTripIdAndStatus(tripId, MatchingOfferStatus.PENDING)
                                .map(o -> Boolean.TRUE.equals(o.getBackToBack()))
                                .orElse(false);

                // ── BƯỚC 2: Cập nhật có điều kiện (Atomic update bằng Mongo findAndModify) ──
                Query query = new Query(Criteria.where("id").is(tripId)
                                .and("status").is(TripStatus.SEARCHING_DRIVER.name()));

                Update update = new Update()
                                .set("driverId", driverUserId) // ✅ Gán trực tiếp userId làm driverId
                                .set("status", TripStatus.DRIVER_ASSIGNED.name())
                                .set("backToBack", isB2B)
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

                // ── Phase 2: Cập nhật MatchingOffer sau khi tài xế nhận chuyến thành công ──
                matchingOfferRepository.findByTripIdAndStatus(tripId, MatchingOfferStatus.PENDING)
                                .ifPresent(offer -> {
                                        offer.setStatus(MatchingOfferStatus.ACCEPTED);
                                        offer.setUpdatedAt(LocalDateTime.now());
                                        matchingOfferRepository.save(offer);

                                        matchingOfferLogRepository.findByOfferId(offer.getId()).ifPresent(logEntry -> {
                                                logEntry.setIsAccepted(1);
                                                logEntry.setResolvedAt(LocalDateTime.now());
                                                matchingOfferLogRepository.save(logEntry);
                                        });
                                });

                // Cancel các offer còn lại (PENDING hoặc EXPIRED chưa xử lý)
                List<MatchingOffer> otherOffers = matchingOfferRepository
                                .findByTripIdAndStatusIn(tripId, List.of(MatchingOfferStatus.PENDING, MatchingOfferStatus.EXPIRED));
                otherOffers.forEach(o -> {
                        if (!o.getStatus().equals(MatchingOfferStatus.ACCEPTED)) {
                                o.setStatus(MatchingOfferStatus.CANCELLED);
                                o.setUpdatedAt(LocalDateTime.now());
                        }
                });
                matchingOfferRepository.saveAll(otherOffers);

                double foodPrice = updated.getTotalFoodPrice() != null ? updated.getTotalFoodPrice() : 0.0;
                java.math.BigDecimal totalAmt = java.math.BigDecimal.valueOf(updated.getShippFare() + foodPrice);

                // ── BƯỚC 3 & 4: Phát sự kiện DRIVER_ASSIGNED bất đồng bộ ──
                tripEventPublisher.publishDriverAssigned(com.driverapp.bookingservice.event.TripEventPayload.builder()
                                .tripId(updated.getId())
                                .customerId(updated.getCustomerId() != null ? updated.getCustomerId().toString() : null)
                                .driverId(driverUserId.toString())
                                .tripStatus("DRIVER_ASSIGNED")
                                .totalAmount(totalAmt)
                                .pickupAddress(updated.getPickUpAddress())
                                .dropoffAddress(updated.getDestinationAddress())
                                .build());

                return new AcceptTripResponse(
                                updated.getId(),
                                updated.getStatus().name(),
                                "Nhận chuyến thành công");
        }

        @Override
        public void updateTripStatus(UUID driverUserId, UpdateTripStatusRequest request) {
                Trip trip = tripRepository.findById(request.tripId())
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Không tìm thấy chuyến đi với mã: " + request.tripId()));

                if (trip.getDriverId() == null || !trip.getDriverId().equals(driverUserId)) {
                        throw new ResponseStatusException(
                                        HttpStatus.FORBIDDEN,
                                        "Bạn không phải tài xế đang thực hiện chuyến đi này");
                }

                TripStatus currentStatus = trip.getStatus();
                TripStatus newStatus = request.status();

                if (currentStatus == TripStatus.COMPLETED || currentStatus == TripStatus.CANCELLED) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Chuyến đi đã kết thúc (trạng thái: " + currentStatus
                                                        + "), không thể cập nhật thêm.");
                }

                validateStatusTransition(currentStatus, newStatus);

                Query query = new Query(Criteria.where("id").is(request.tripId()));
                Update update = new Update()
                                .set("status", newStatus)
                                .set("updatedAt", LocalDateTime.now());

                Trip updatedTrip = mongoTemplate.findAndModify(
                                query,
                                update,
                                org.springframework.data.mongodb.core.FindAndModifyOptions.options().returnNew(true),
                                Trip.class);

                if (updatedTrip == null) {
                        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                                        "Không thể cập nhật trạng thái chuyến đi");
                }

                double foodPriceUpdated = updatedTrip.getTotalFoodPrice() != null ? updatedTrip.getTotalFoodPrice() : 0.0;
                java.math.BigDecimal totalAmtUpdated = java.math.BigDecimal.valueOf(updatedTrip.getShippFare() + foodPriceUpdated);

                if (newStatus == TripStatus.COMPLETED) {
                        tripEventPublisher.publishTripCompleted(com.driverapp.bookingservice.event.TripEventPayload.builder()
                                        .tripId(updatedTrip.getId())
                                        .customerId(updatedTrip.getCustomerId() != null ? updatedTrip.getCustomerId().toString() : null)
                                        .driverId(driverUserId.toString())
                                        .tripStatus("COMPLETED")
                                        .paymentMethod("PAY_DIRECTLY")
                                        .totalAmount(totalAmtUpdated)
                                        .pickupAddress(updatedTrip.getPickUpAddress())
                                        .dropoffAddress(updatedTrip.getDestinationAddress())
                                        .build());
                } else {
                        tripEventPublisher.publishTripEvent("trip." + newStatus.name().toLowerCase().replace('_', '-'), 
                                        com.driverapp.bookingservice.event.TripEventPayload.builder()
                                        .tripId(updatedTrip.getId())
                                        .customerId(updatedTrip.getCustomerId() != null ? updatedTrip.getCustomerId().toString() : null)
                                        .driverId(driverUserId.toString())
                                        .tripStatus(newStatus.name())
                                        .totalAmount(totalAmtUpdated)
                                        .pickupAddress(updatedTrip.getPickUpAddress())
                                        .dropoffAddress(updatedTrip.getDestinationAddress())
                                        .build());
                }
        }

        private void validateStatusTransition(TripStatus current, TripStatus target) {
                if (target == TripStatus.CANCELLED) {
                        throw new ResponseStatusException(
                                        HttpStatus.FORBIDDEN,
                                        "Tài xế không có quyền hủy chuyến đi");
                }

                boolean valid = switch (current) {
                        case DRIVER_ASSIGNED -> (target == TripStatus.DRIVER_ARRIVING);
                        case DRIVER_ARRIVING -> (target == TripStatus.IN_PROGRESS);
                        case IN_PROGRESS -> (target == TripStatus.COMPLETED);
                        default -> false;
                };

                if (!valid) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Không thể chuyển trạng thái chuyến đi từ " + current + " sang " + target);
                }
        }

        @Override
        public void cancelTripByCustomer(String tripId, UUID customerId, CancelTripRequest request) {
                if (request.status() != TripStatus.CANCELLED) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Trạng thái yêu cầu phải là CANCELLED");
                }

                Trip trip = tripRepository.findById(tripId)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Không tìm thấy chuyến đi với mã: " + tripId));

                if (trip.getCustomerId() == null || !trip.getCustomerId().equals(customerId)) {
                        throw new ResponseStatusException(
                                        HttpStatus.FORBIDDEN,
                                        "Bạn không có quyền hủy chuyến đi này");
                }

                if (trip.getStatus() == TripStatus.CANCELLED) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Chuyến đi này đã bị hủy trước đó");
                }

                if (trip.getDriverId() != null || trip.getStatus() != TripStatus.SEARCHING_DRIVER) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Không thể hủy chuyến đi vì đã có tài xế nhận chuyến hoặc chuyến đi đã bắt đầu");
                }

                Query query = new Query(Criteria.where("id").is(tripId)
                                .and("customerId").is(customerId)
                                .and("status").is(TripStatus.SEARCHING_DRIVER.name())
                                .and("driverId").is(null));

                Update update = new Update()
                                .set("status", TripStatus.CANCELLED.name())
                                .set("cancelReason", request.cancelReason())
                                .set("updatedAt", LocalDateTime.now());

                Trip cancelledTrip = mongoTemplate.findAndModify(
                                query,
                                update,
                                org.springframework.data.mongodb.core.FindAndModifyOptions.options().returnNew(true),
                                Trip.class);

                if (cancelledTrip == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Không thể hủy chuyến đi do tài xế vừa nhận chuyến hoặc trạng thái chuyến đã thay đổi");
                }

                tripEventPublisher.publishTripCancelled(com.driverapp.bookingservice.event.TripEventPayload.builder()
                                .tripId(cancelledTrip.getId())
                                .customerId(cancelledTrip.getCustomerId() != null ? cancelledTrip.getCustomerId().toString() : null)
                                .driverId(cancelledTrip.getDriverId() != null ? cancelledTrip.getDriverId().toString() : null)
                                .tripStatus("CANCELLED")
                                .pickupAddress(cancelledTrip.getPickUpAddress())
                                .dropoffAddress(cancelledTrip.getDestinationAddress())
                                .build());
        }

        @Override
        public long countCompletedTrips(UUID customerId) {
                return tripRepository.countByCustomerIdAndStatus(customerId, TripStatus.COMPLETED);
        }

        @Override
        public com.driverapp.bookingservice.dto.response.TripPriceDto getTripPrice(String tripId) {
                Trip trip = tripRepository.findById(tripId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chuyến đi không tồn tại"));

                return new com.driverapp.bookingservice.dto.response.TripPriceDto(
                                trip.getId(),
                                trip.getCustomerId(),
                                trip.getDriverId(),
                                trip.getShippFare(),
                                trip.getTotalFoodPrice(),
                                trip.getStatus() != null ? trip.getStatus().name() : null
                );
        }

        @Override
        public Trip getTripById(String tripId) {
                return tripRepository.findById(tripId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chuyến đi với id: " + tripId));
        }

        @Override
        public Trip getCurrentTrip(UUID customerId) {
                return tripRepository.findTopByCustomerIdOrderByCreatedAtDesc(customerId)
                                .orElse(null);
        }

        @Override
        public java.util.Map<String, Object> simulateMatchingForDriver(UUID driverUserId, double lat, double lng, com.driverapp.bookingservice.models.enums.VehicleType vehicleType) {
                // 1. Tạo cuốc xe mô phỏng của khách tại tọa độ của tài xế
                Trip trip = Trip.builder()
                                .customerId(UUID.randomUUID())
                                .pickUpLatitude(lat)
                                .pickUpLongitude(lng)
                                .pickUpAddress("Điểm đón mô phỏng (Hồ Hoàn Kiếm, Hà Nội)")
                                .destinationLatitude(21.007050)
                                .destinationLongitude(105.843180)
                                .destinationAddress("Đại học Bách Khoa, Hai Bà Trưng, Hà Nội")
                                .shippingType(ShippingType.PASSENGER)
                                .vehicleType(vehicleType != null ? vehicleType : com.driverapp.bookingservice.models.enums.VehicleType.MOTORBIKE)
                                .shippFare(25000.0)
                                .status(TripStatus.SEARCHING_DRIVER)
                                .createdAt(LocalDateTime.now())
                                .updatedAt(LocalDateTime.now())
                                .build();
                Trip savedTrip = tripRepository.save(trip);

                // 2. Tạo lời mời MatchingOffer gán thẳng cho tài xế này
                MatchingOffer offer = MatchingOffer.builder()
                                .driverId(driverUserId)
                                .tripId(savedTrip.getId())
                                .status(MatchingOfferStatus.PENDING)
                                .createdAt(LocalDateTime.now())
                                .updatedAt(LocalDateTime.now())
                                .build();
                MatchingOffer savedOffer = matchingOfferRepository.save(offer);

                return java.util.Map.of(
                                "message", "Mô phỏng cuốc xe ghép thành công!",
                                "tripId", savedTrip.getId(),
                                "offerId", savedOffer.getId(),
                                "pickUpAddress", savedTrip.getPickUpAddress(),
                                "destinationAddress", savedTrip.getDestinationAddress(),
                                "shippFare", savedTrip.getShippFare(),
                                "driverId", driverUserId.toString()
                );
        }
}
