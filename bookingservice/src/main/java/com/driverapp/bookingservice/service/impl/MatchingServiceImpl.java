package com.driverapp.bookingservice.service.impl;

import com.driverapp.bookingservice.client.AiMatchingClient;
import com.driverapp.bookingservice.client.DriverServiceClient;
import com.driverapp.bookingservice.client.NotificationClient;
import com.driverapp.bookingservice.dto.ai.DriverScoringRequest;
import com.driverapp.bookingservice.dto.ai.DriverScoringResponse;
import com.driverapp.bookingservice.dto.request.CreateNotificationRequest;
import com.driverapp.bookingservice.dto.response.NearbyDriverDto;
import com.driverapp.bookingservice.event.OfferTimeoutPayload;
import com.driverapp.bookingservice.event.TripEventPayload;
import com.driverapp.bookingservice.models.MatchingOffer;
import com.driverapp.bookingservice.models.MatchingOfferLog;
import com.driverapp.bookingservice.models.MatchingSession;
import com.driverapp.bookingservice.models.Trip;
import com.driverapp.bookingservice.models.enums.MatchingOfferStatus;
import com.driverapp.bookingservice.models.enums.TripStatus;
import com.driverapp.bookingservice.publisher.MatchingEventPublisher;
import com.driverapp.bookingservice.repository.MatchingOfferLogRepository;
import com.driverapp.bookingservice.repository.MatchingOfferRepository;
import com.driverapp.bookingservice.repository.MatchingSessionRepository;
import com.driverapp.bookingservice.repository.TripRepository;
import com.driverapp.bookingservice.service.MatchingService;
import com.driverapp.bookingservice.service.RoutingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MatchingServiceImpl implements MatchingService {

    private static final int OFFER_TIMEOUT_SECONDS = 12;
    private static final double SEARCH_RADIUS_KM = 3.0;
    private static final int MAX_CANDIDATES = 40;

    private final DriverServiceClient driverServiceClient;
    private final RoutingService routingService;
    private final AiMatchingClient aiMatchingClient;
    private final MatchingOfferRepository matchingOfferRepository;
    private final MatchingOfferLogRepository matchingOfferLogRepository;
    private final MatchingSessionRepository matchingSessionRepository;
    private final TripRepository tripRepository;
    private final NotificationClient notificationClient;
    private final MatchingEventPublisher matchingEventPublisher;
    private final MongoTemplate mongoTemplate;

    @Value("${matching.shadow-logging:true}")
    private boolean shadowLogging;

    @Value("${matching.strategy:AI_MODEL}")
    private String matchingStrategy;

    @Override
    public void handleTripCreated(TripEventPayload payload) {
        String tripId = payload.getTripId();

        // 1. Chuyển trạng thái Trip: REQUESTED -> SEARCHING_DRIVER (atomic)
        Query query = new Query(Criteria.where("id").is(tripId)
                .and("status").is(TripStatus.REQUESTED.name()));
        Update update = new Update()
                .set("status", TripStatus.SEARCHING_DRIVER.name())
                .set("updatedAt", LocalDateTime.now());

        Trip trip = mongoTemplate.findAndModify(query, update,
                FindAndModifyOptions.options().returnNew(true), Trip.class);

        if (trip == null) {
            log.warn("[Matching] Bỏ qua trip.created vì Trip {} không ở trạng thái REQUESTED", tripId);
            return;
        }

        double pickUpLat = trip.getPickUpLatitude();
        double pickUpLng = trip.getPickUpLongitude();
        String vehicleType = trip.getVehicleType() != null ? trip.getVehicleType().name() : null;

        log.info("[Matching] Bắt đầu tìm tài xế cho Trip {} tại ({}, {})", tripId, pickUpLat, pickUpLng);

        // 2. Quét Redis GEO lấy tối đa 40 tài xế lân cận
        List<NearbyDriverDto> candidates = driverServiceClient.getNearbyDrivers(
                pickUpLat, pickUpLng, SEARCH_RADIUS_KM, vehicleType, MAX_CANDIDATES);

        if (candidates.isEmpty()) {
            log.warn("[Matching] Không tìm thấy tài xế nào trong bán kính {}km cho Trip {}", SEARCH_RADIUS_KM, tripId);
            markTripNoDriverFound(tripId);
            return;
        }

        // 3. Tính ETA 1-to-N qua OSRM Table API
        List<double[]> driverCoords = candidates.stream()
                .map(d -> new double[]{d.latitude(), d.longitude()})
                .toList();

        List<Double> etas = routingService.calculateEtasToPickup(pickUpLat, pickUpLng, driverCoords);

        // 4. Xếp hạng: Gọi AI Scoring Model (Fallback về Rule-based ETA nếu AI lỗi/timeout)
        List<MatchingSession.CandidateDriver> rankedList = rankCandidates(trip, candidates, etas);

        // 5. Lưu session điều phối vào MongoDB
        MatchingSession session = MatchingSession.builder()
                .tripId(tripId)
                .currentRank(1)
                .candidates(rankedList)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        matchingSessionRepository.save(session);

        // 6. Phát offer cho tài xế hạng #1
        dispatchOfferToCandidate(tripId, session, 1);
    }

    private List<MatchingSession.CandidateDriver> rankCandidates(
            Trip trip, List<NearbyDriverDto> candidates, List<Double> etas) {

        List<MatchingSession.CandidateDriver> rankedList = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        if ("AI_MODEL".equalsIgnoreCase(matchingStrategy)) {
            try {
                // Chuẩn bị Feature Vector cho AI Scoring
                List<DriverScoringRequest.CandidateFeature> features = new ArrayList<>();
                for (int i = 0; i < candidates.size(); i++) {
                    NearbyDriverDto d = candidates.get(i);
                    double eta = (i < etas.size()) ? etas.get(i) : 999.0;

                    features.add(DriverScoringRequest.CandidateFeature.builder()
                            .driverId(d.driverUserId())
                            .pickupDistanceKm(d.distanceKm())
                            .pickupEtaMinutes(eta)
                            .driverRating(4.8)
                            .acceptRate7d(0.85)
                            .tripsCompletedToday(5)
                            .build());
                }

                DriverScoringRequest aiRequest = new DriverScoringRequest(
                        trip.getId(),
                        trip.getShippFare(),
                        now.getHour(),
                        now.getDayOfWeek().getValue(),
                        features
                );

                // Gọi AI Scoring Service qua Circuit Breaker (Timeout 50ms)
                Optional<DriverScoringResponse> aiResponse = aiMatchingClient.scoreCandidates(aiRequest);

                if (aiResponse.isPresent() && !aiResponse.get().rankedCandidates().isEmpty()) {
                    log.info("[Matching] Áp dụng xếp hạng AI Matching Model cho Trip {}", trip.getId());
                    Map<UUID, NearbyDriverDto> driverMap = candidates.stream()
                            .collect(Collectors.toMap(NearbyDriverDto::driverUserId, d -> d));

                    for (DriverScoringResponse.ScoredCandidate sc : aiResponse.get().rankedCandidates()) {
                        NearbyDriverDto d = driverMap.get(sc.driverId());
                        if (d != null) {
                            double eta = features.stream()
                                    .filter(f -> f.driverId().equals(sc.driverId()))
                                    .map(DriverScoringRequest.CandidateFeature::pickupEtaMinutes)
                                    .findFirst().orElse(999.0);

                            rankedList.add(MatchingSession.CandidateDriver.builder()
                                    .driverId(sc.driverId())
                                    .etaMinutes(eta)
                                    .distanceKm(d.distanceKm())
                                    .rank(sc.rank())
                                    .build());
                        }
                    }
                    return rankedList;
                }
            } catch (Exception e) {
                log.warn("[Matching] Gặp lỗi khi gọi AI Service ({}). Kích hoạt Rule-based Fallback.", e.getMessage());
            }
        }

        // Fallback: Rule-based (ETA tăng dần)
        log.info("[Matching] Áp dụng thuật toán Rule-based (ETA tăng dần) cho Trip {}", trip.getId());
        for (int i = 0; i < candidates.size(); i++) {
            NearbyDriverDto d = candidates.get(i);
            double eta = (i < etas.size()) ? etas.get(i) : 999.0;
            rankedList.add(MatchingSession.CandidateDriver.builder()
                    .driverId(d.driverUserId())
                    .etaMinutes(eta)
                    .distanceKm(d.distanceKm())
                    .build());
        }
        rankedList.sort(Comparator.comparingDouble(MatchingSession.CandidateDriver::getEtaMinutes));
        for (int i = 0; i < rankedList.size(); i++) {
            rankedList.get(i).setRank(i + 1);
        }

        return rankedList;
    }

    private void dispatchOfferToCandidate(String tripId, MatchingSession session, int targetRank) {
        List<MatchingSession.CandidateDriver> candidates = session.getCandidates();
        int index = targetRank - 1;

        if (index >= candidates.size()) {
            log.warn("[Matching] Đã hết ứng viên cho Trip {}", tripId);
            markTripNoDriverFound(tripId);
            return;
        }

        // Kiểm tra Trip còn ở trạng thái SEARCHING_DRIVER không
        Trip trip = tripRepository.findById(tripId).orElse(null);
        if (trip == null || !TripStatus.SEARCHING_DRIVER.equals(trip.getStatus())) {
            log.info("[Matching] Trip {} không còn SEARCHING_DRIVER. Dừng dispatch.", tripId);
            return;
        }

        MatchingSession.CandidateDriver candidate = candidates.get(index);

        // Tạo MatchingOffer PENDING
        MatchingOffer offer = MatchingOffer.builder()
                .driverId(candidate.getDriverId())
                .tripId(tripId)
                .status(MatchingOfferStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        MatchingOffer savedOffer = matchingOfferRepository.save(offer);

        session.setCurrentRank(targetRank);
        session.setCurrentOfferId(savedOffer.getId());
        session.setUpdatedAt(LocalDateTime.now());
        matchingSessionRepository.save(session);

        // Push thông báo đến App tài xế
        notificationClient.createNotification(new CreateNotificationRequest(
                "Có cuốc xe mới!",
                String.format("Khách cách bạn %.1f phút. Bạn có %ds để nhận cuốc.",
                        candidate.getEtaMinutes(), OFFER_TIMEOUT_SECONDS),
                candidate.getDriverId()));

        // Hẹn giờ timeout 12s qua RabbitMQ Delay Queue
        matchingEventPublisher.scheduleOfferTimeout(tripId, savedOffer.getId(), targetRank);

        // Ghi log phục vụ Machine Learning Phase 3 (Shadow Logging)
        if (shadowLogging) {
            try {
                LocalDateTime now = LocalDateTime.now();
                double fare = (trip != null) ? trip.getShippFare() : 25000.0;
                MatchingOfferLog logEntry = MatchingOfferLog.builder()
                        .tripId(tripId)
                        .offerId(savedOffer.getId())
                        .driverId(candidate.getDriverId())
                        .tripFare(fare)
                        .pickupDistanceKm(candidate.getDistanceKm())
                        .pickupEtaMinutes(candidate.getEtaMinutes())
                        .driverRating(4.8)
                        .acceptRate7d(0.85)
                        .tripsCompletedToday(5)
                        .hourOfDay(now.getHour())
                        .dayOfWeek(now.getDayOfWeek().getValue())
                        .isAccepted(null)
                        .createdAt(now)
                        .build();
                matchingOfferLogRepository.save(logEntry);
            } catch (Exception e) {
                log.warn("[ShadowLog] Không thể ghi log lượt offer: {}", e.getMessage());
            }
        }

        log.info("[Matching] Đã gửi Offer {} cho Tài xế {} (Rank {}, ETA={}phút)",
                savedOffer.getId(), candidate.getDriverId(), targetRank, candidate.getEtaMinutes());
    }

    @Override
    public void handleOfferTimeout(OfferTimeoutPayload payload) {
        String tripId = payload.getTripId();
        String offerId = payload.getOfferId();
        int rank = payload.getRank();

        // Kiểm tra trạng thái Offer hiện tại
        MatchingOffer offer = matchingOfferRepository.findById(offerId).orElse(null);
        if (offer == null || offer.getStatus() != MatchingOfferStatus.PENDING) {
            log.info("[Matching] Offer {} không còn PENDING (Status={}). Bỏ qua timeout.",
                    offerId, offer != null ? offer.getStatus() : "NULL");
            return;
        }

        // Atomic: Cập nhật Offer -> EXPIRED
        Query query = new Query(Criteria.where("id").is(offerId).and("status").is(MatchingOfferStatus.PENDING));
        Update update = new Update().set("status", MatchingOfferStatus.EXPIRED).set("updatedAt", LocalDateTime.now());
        mongoTemplate.findAndModify(query, update, FindAndModifyOptions.options().returnNew(true), MatchingOffer.class);

        // Cập nhật nhãn isAccepted = 0 cho bản ghi log (Quá hạn 12s)
        if (shadowLogging) {
            try {
                matchingOfferLogRepository.findByOfferId(offerId).ifPresent(logEntry -> {
                    logEntry.setIsAccepted(0);
                    logEntry.setResolvedAt(LocalDateTime.now());
                    matchingOfferLogRepository.save(logEntry);
                });
            } catch (Exception e) {
                log.warn("[ShadowLog] Lỗi cập nhật nhãn timeout: {}", e.getMessage());
            }
        }

        log.info("[Matching] Offer #{} cho Trip {} đã hết hạn 12s. Chuyển sang tài xế kế tiếp.", rank, tripId);

        MatchingSession session = matchingSessionRepository.findById(tripId).orElse(null);
        if (session != null) {
            dispatchOfferToCandidate(tripId, session, rank + 1);
        }
    }

    @Override
    public void rejectOffer(String offerId) {
        MatchingOffer offer = matchingOfferRepository.findById(offerId).orElse(null);
        if (offer == null || offer.getStatus() != MatchingOfferStatus.PENDING) {
            return;
        }

        offer.setStatus(MatchingOfferStatus.REJECTED);
        offer.setUpdatedAt(LocalDateTime.now());
        matchingOfferRepository.save(offer);

        // Cập nhật nhãn isAccepted = 0 cho bản ghi log (Tài xế từ chối)
        if (shadowLogging) {
            try {
                matchingOfferLogRepository.findByOfferId(offerId).ifPresent(logEntry -> {
                    logEntry.setIsAccepted(0);
                    logEntry.setResolvedAt(LocalDateTime.now());
                    matchingOfferLogRepository.save(logEntry);
                });
            } catch (Exception e) {
                log.warn("[ShadowLog] Lỗi cập nhật nhãn từ chối: {}", e.getMessage());
            }
        }

        log.info("[Matching] Tài xế từ chối Offer {}. Chuyển sang ứng viên tiếp theo.", offerId);

        MatchingSession session = matchingSessionRepository.findById(offer.getTripId()).orElse(null);
        if (session != null) {
            dispatchOfferToCandidate(offer.getTripId(), session, session.getCurrentRank() + 1);
        }
    }

    private void markTripNoDriverFound(String tripId) {
        Query query = new Query(Criteria.where("id").is(tripId)
                .and("status").is(TripStatus.SEARCHING_DRIVER.name()));
        Update update = new Update().set("status", TripStatus.NO_DRIVER_FOUND.name()).set("updatedAt", LocalDateTime.now());
        Trip updated = mongoTemplate.findAndModify(query, update, FindAndModifyOptions.options().returnNew(true), Trip.class);

        if (updated != null) {
            log.warn("[Matching] Trip {} → NO_DRIVER_FOUND. Gửi thông báo cho khách hàng.", tripId);
            notificationClient.createNotification(new CreateNotificationRequest(
                    "Không tìm được tài xế",
                    "Rất tiếc, các tài xế lân cận hiện đang bận hoặc không phản hồi. Vui lòng thử lại sau.",
                    updated.getCustomerId()));
        }
    }
}
