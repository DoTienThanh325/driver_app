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
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MatchingServiceImpl implements MatchingService {

    private static final int OFFER_TIMEOUT_SECONDS = 12;
    private static final double[] SEARCH_ROUNDS_RADIUS = {3.0, 5.0, 8.0};
    private static final int MAX_SEARCH_ROUNDS = 3;
    private static final int RETRY_DELAY_SECONDS = 5;
    private static final int MAX_CANDIDATES = 40;
    private static final int TOP_AI_BROADCAST_CANDIDATES = 3; // Phát danh sách cuốc cho Top 3 tài xế tiềm năng nhất

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
                .set("searchRound", 1)
                .set("searchRadiusKm", SEARCH_ROUNDS_RADIUS[0])
                .set("updatedAt", LocalDateTime.now());

        Trip trip = mongoTemplate.findAndModify(query, update,
                FindAndModifyOptions.options().returnNew(true), Trip.class);

        if (trip == null) {
            log.warn("[Matching] Bỏ qua trip.created vì Trip {} không ở trạng thái REQUESTED", tripId);
            return;
        }

        // Bắt đầu Vòng 1 tìm kiếm
        executeMatchingRound(tripId, 1);
    }

    private void executeMatchingRound(String tripId, int round) {
        Trip trip = tripRepository.findById(tripId).orElse(null);
        if (trip == null || !TripStatus.SEARCHING_DRIVER.equals(trip.getStatus())) {
            log.info("[Matching] Trip {} không còn SEARCHING_DRIVER (hiện tại={}). Dừng quét vòng {}.",
                    tripId, trip != null ? trip.getStatus() : "NULL", round);
            return;
        }

        double radiusKm = (round <= SEARCH_ROUNDS_RADIUS.length) ? SEARCH_ROUNDS_RADIUS[round - 1] : 8.0;

        // Cập nhật thông tin vòng quét để App hiển thị trực quan cho khách
        mongoTemplate.updateFirst(
                new Query(Criteria.where("id").is(tripId)),
                new Update().set("searchRound", round).set("searchRadiusKm", radiusKm).set("updatedAt", LocalDateTime.now()),
                Trip.class
        );

        double pickUpLat = trip.getPickUpLatitude();
        double pickUpLng = trip.getPickUpLongitude();
        String vehicleType = trip.getVehicleType() != null ? trip.getVehicleType().name() : null;

        log.info("[Matching] VÒNG {} (Bán kính {}km) tìm tài xế cho Trip {} tại ({}, {})",
                round, radiusKm, tripId, pickUpLat, pickUpLng);

        // 1. Quét Redis GEO lấy tài xế AVAILABLE
        List<NearbyDriverDto> availableDrivers = driverServiceClient.getNearbyDrivers(
                pickUpLat, pickUpLng, radiusKm, vehicleType, MAX_CANDIDATES);

        // 2. [Giải pháp 3]: Quét tài xế đang chở khách sắp tới điểm trả (Cuốc gối đầu / Back-to-back)
        List<NearbyDriverDto> backToBackDrivers = findBackToBackCandidates(trip, radiusKm);

        // Hợp nhất ứng viên (loại trừ trùng lặp driverId)
        Map<UUID, NearbyDriverDto> candidateMap = new LinkedHashMap<>();
        if (availableDrivers != null) {
            for (NearbyDriverDto d : availableDrivers) {
                candidateMap.put(d.driverUserId(), d);
            }
        }
        for (NearbyDriverDto b2b : backToBackDrivers) {
            if (!candidateMap.containsKey(b2b.driverUserId())) {
                candidateMap.put(b2b.driverUserId(), b2b);
            }
        }
        List<NearbyDriverDto> candidates = new ArrayList<>(candidateMap.values());

        if (candidates.isEmpty()) {
            if (round < MAX_SEARCH_ROUNDS) {
                log.info("[Matching] Vòng {} ({}km) chưa có tài xế cho Trip {}. Chờ {}s để mở rộng sang Vòng {}...",
                        round, radiusKm, tripId, RETRY_DELAY_SECONDS, round + 1);
                CompletableFuture.delayedExecutor(RETRY_DELAY_SECONDS, TimeUnit.SECONDS)
                        .execute(() -> executeMatchingRound(tripId, round + 1));
            } else {
                log.warn("[Matching] Đã quét hết {} vòng (tối đa {}km) cho Trip {}. Chuyển sang NO_DRIVER_FOUND",
                        MAX_SEARCH_ROUNDS, radiusKm, tripId);
                markTripNoDriverFound(tripId);
            }
            return;
        }

        // 3. Tính ETA 1-to-N qua OSRM Table API
        List<double[]> driverCoords = candidates.stream()
                .map(d -> new double[]{d.latitude(), d.longitude()})
                .toList();

        List<Double> etas = routingService.calculateEtasToPickup(pickUpLat, pickUpLng, driverCoords);

        // 4. Xếp hạng: AI Scoring Model (Fallback về Rule-based ETA)
        List<MatchingSession.CandidateDriver> rankedList = rankCandidates(trip, candidates, etas);

        // 5. Lưu session điều phối vào MongoDB
        MatchingSession session = MatchingSession.builder()
                .tripId(tripId)
                .currentRank(1)
                .searchRound(round)
                .currentRadiusKm(radiusKm)
                .candidates(rankedList)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        matchingSessionRepository.save(session);

        // 6. Phát offer đồng thời cho Top các tài xế tiềm năng nhất
        int broadcastCount = Math.min(TOP_AI_BROADCAST_CANDIDATES, rankedList.size());
        log.info("[Matching] Vòng {}: Phát cuốc xe {} đồng thời cho Top {} tài xế (Tổng {} ứng viên, gồm {} tài xế gối đầu)",
                round, tripId, broadcastCount, rankedList.size(), backToBackDrivers.size());
        for (int rank = 1; rank <= broadcastCount; rank++) {
            dispatchOfferToCandidate(tripId, session, rank);
        }
    }

    /**
     * Tìm các tài xế đang chở khách (IN_PROGRESS) mà điểm trả khách gần điểm đón của khách mới (<= maxDistanceKm)
     */
    private List<NearbyDriverDto> findBackToBackCandidates(Trip newTrip, double maxDistanceKm) {
        try {
            Query query = new Query(Criteria.where("status").is(TripStatus.IN_PROGRESS.name()));
            if (newTrip.getVehicleType() != null) {
                query.addCriteria(Criteria.where("vehicleType").is(newTrip.getVehicleType().name()));
            }
            List<Trip> activeTrips = mongoTemplate.find(query, Trip.class);
            if (activeTrips.isEmpty()) return Collections.emptyList();

            List<NearbyDriverDto> b2bCandidates = new ArrayList<>();
            double pickupLat = newTrip.getPickUpLatitude();
            double pickupLng = newTrip.getPickUpLongitude();

            for (Trip activeTrip : activeTrips) {
                if (activeTrip.getDriverId() == null) continue;
                if (activeTrip.getId().equals(newTrip.getId())) continue;

                double dropLat = activeTrip.getDestinationLatitude();
                double dropLng = activeTrip.getDestinationLongitude();

                double distanceKm = calculateHaversineDistance(dropLat, dropLng, pickupLat, pickupLng);
                // Giới hạn bán kính cuốc gối đầu tối đa 4km hoặc theo maxDistanceKm
                if (distanceKm <= Math.min(maxDistanceKm, 4.0)) {
                    log.info("[BackToBack] Tìm thấy tài xế {} đang hoàn thành cuốc xe {} (cách điểm đón mới {}km)",
                            activeTrip.getDriverId(), activeTrip.getId(), String.format("%.2f", distanceKm));
                    b2bCandidates.add(new NearbyDriverDto(
                            activeTrip.getDriverId(),
                            dropLat,
                            dropLng,
                            Math.round(distanceKm * 100.0) / 100.0,
                            newTrip.getVehicleType() != null ? newTrip.getVehicleType().name() : "MOTORBIKE",
                            true
                    ));
                }
            }
            return b2bCandidates;
        } catch (Exception e) {
            log.warn("[BackToBack] Lỗi khi quét ứng viên cuốc gối đầu: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Bán kính Trái Đất (km)
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
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
                                    .backToBack(Boolean.TRUE.equals(d.backToBack()))
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
                    .backToBack(Boolean.TRUE.equals(d.backToBack()))
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
            int currentRound = session.getSearchRound() > 0 ? session.getSearchRound() : 1;
            if (currentRound < MAX_SEARCH_ROUNDS) {
                log.info("[Matching] Đã hết ứng viên Vòng {}. Mở rộng sang Vòng {} sau {}s...",
                        currentRound, currentRound + 1, RETRY_DELAY_SECONDS);
                CompletableFuture.delayedExecutor(RETRY_DELAY_SECONDS, TimeUnit.SECONDS)
                        .execute(() -> executeMatchingRound(tripId, currentRound + 1));
            } else {
                log.warn("[Matching] Đã hết ứng viên cho Trip {} sau {} vòng.", tripId, MAX_SEARCH_ROUNDS);
                markTripNoDriverFound(tripId);
            }
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
                .backToBack(candidate.isBackToBack())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        MatchingOffer savedOffer = matchingOfferRepository.save(offer);

        session.setCurrentRank(targetRank);
        session.setCurrentOfferId(savedOffer.getId());
        session.setUpdatedAt(LocalDateTime.now());
        matchingSessionRepository.save(session);

        // Push thông báo đến App tài xế
        String notifMsg = candidate.isBackToBack()
                ? String.format("⚡ Cuốc gối đầu! Khách cách điểm trả của bạn %.1f phút. Bạn có %ds để nhận cuốc.",
                        candidate.getEtaMinutes(), OFFER_TIMEOUT_SECONDS)
                : String.format("Khách cách bạn %.1f phút. Bạn có %ds để nhận cuốc.",
                        candidate.getEtaMinutes(), OFFER_TIMEOUT_SECONDS);

        notificationClient.createNotification(new CreateNotificationRequest(
                candidate.isBackToBack() ? "Có cuốc xe gối đầu mới!" : "Có cuốc xe mới!",
                notifMsg,
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

        log.info("[Matching] Đã gửi Offer {} (B2B={}) cho Tài xế {} (Rank {}, ETA={}phút)",
                savedOffer.getId(), candidate.isBackToBack(), candidate.getDriverId(), targetRank, candidate.getEtaMinutes());
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

    @Override
    public List<com.driverapp.bookingservice.dto.response.DriverOfferResponse> getPendingOffersForDriver(UUID driverId) {
        List<MatchingOffer> pendingOffers = matchingOfferRepository.findByDriverIdAndStatus(driverId, MatchingOfferStatus.PENDING);
        if (pendingOffers.isEmpty()) {
            return Collections.emptyList();
        }

        List<com.driverapp.bookingservice.dto.response.DriverOfferResponse> result = new ArrayList<>();
        for (MatchingOffer offer : pendingOffers) {
            Trip trip = tripRepository.findById(offer.getTripId()).orElse(null);
            // Chỉ hiển thị cuốc xe vẫn đang ở trạng thái tìm tài xế
            if (trip != null && (TripStatus.SEARCHING_DRIVER.equals(trip.getStatus()) || TripStatus.REQUESTED.equals(trip.getStatus()))) {
                MatchingSession session = matchingSessionRepository.findById(trip.getId()).orElse(null);
                int rank = 1;
                double etaMinutes = 3.0;
                double distanceKm = 1.0;
                boolean isB2B = Boolean.TRUE.equals(offer.getBackToBack());

                if (session != null && session.getCandidates() != null) {
                    for (MatchingSession.CandidateDriver cd : session.getCandidates()) {
                        if (cd.getDriverId().equals(driverId)) {
                            rank = cd.getRank();
                            etaMinutes = cd.getEtaMinutes();
                            distanceKm = cd.getDistanceKm();
                            if (cd.isBackToBack()) isB2B = true;
                            break;
                        }
                    }
                }

                result.add(com.driverapp.bookingservice.dto.response.DriverOfferResponse.builder()
                        .offerId(offer.getId())
                        .tripId(trip.getId())
                        .pickUpAddress(trip.getPickUpAddress())
                        .pickUpLatitude(trip.getPickUpLatitude())
                        .pickUpLongitude(trip.getPickUpLongitude())
                        .destinationAddress(trip.getDestinationAddress())
                        .destinationLatitude(trip.getDestinationLatitude())
                        .destinationLongitude(trip.getDestinationLongitude())
                        .distanceKm(distanceKm)
                        .etaMinutes(etaMinutes)
                        .shippFare(trip.getShippFare())
                        .totalFoodPrice(trip.getTotalFoodPrice())
                        .shippingType(trip.getShippingType())
                        .vehicleType(trip.getVehicleType())
                        .aiRank(rank)
                        .backToBack(isB2B)
                        .createdAt(offer.getCreatedAt())
                        .build());
            }
        }

        // Sắp xếp: Ưu tiên cuốc mà AI xếp tài xế này ở Rank cao nhất
        result.sort(Comparator.comparingInt(com.driverapp.bookingservice.dto.response.DriverOfferResponse::getAiRank));
        return result;
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
                    "Rất tiếc, các tài xế lân cận hiện đang bận hoặc không phản hồi sau nhiều vòng tìm kiếm. Vui lòng thử lại sau.",
                    updated.getCustomerId()));
        }
    }
}
