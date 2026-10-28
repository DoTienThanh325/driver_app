package com.driverapp.bookingservice.service.impl;

import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import com.driverapp.bookingservice.client.FoodRecommendationClient;
import com.driverapp.bookingservice.dto.ai.FoodRecommendationRequest;
import com.driverapp.bookingservice.dto.ai.FoodRecommendationResponse;
import com.driverapp.bookingservice.dto.response.FoodSearchResponse;
import com.driverapp.bookingservice.elasticsearch.document.FoodDocument;
import com.driverapp.bookingservice.models.Trip;
import com.driverapp.bookingservice.models.enums.ShippingType;
import com.driverapp.bookingservice.repository.TripRepository;
import com.driverapp.bookingservice.service.FoodRecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.client.elc.NativeQueryBuilder;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FoodRecommendationServiceImpl implements FoodRecommendationService {

    private static final int MAX_CANDIDATE_FOODS = 50;

    private final ElasticsearchOperations elasticsearchOperations;
    private final FoodRecommendationClient foodRecommendationClient;
    private final TripRepository tripRepository;

    @Override
    public Page<FoodSearchResponse> getRecommendedFoods(
            UUID customerId, double latitude, double longitude, double radiusKm, int page, int size) {

        // 1. TẦNG 1: LỌC THÔ ĐỊA LÝ QUA ELASTICSEARCH (Candidate Retrieval)
        BoolQuery.Builder boolQuery = new BoolQuery.Builder();
        boolQuery.must(Query.of(q -> q.matchAll(m -> m)));

        // Lọc cứng geo_distance theo bán kính radiusKm
        boolQuery.filter(f -> f.geoDistance(g -> g
                .field("restaurantLocation")
                .distance(radiusKm + "km")
                .location(l -> l.latlon(ll -> ll.lat(latitude).lon(longitude)))
        ));

        NativeQueryBuilder queryBuilder = new NativeQueryBuilder()
                .withQuery(Query.of(q -> q.bool(boolQuery.build())))
                .withSort(s -> s.geoDistance(g -> g
                        .field("restaurantLocation")
                        .location(l -> l.latlon(ll -> ll.lat(latitude).lon(longitude)))
                        .order(SortOrder.Asc)
                ))
                .withPageable(PageRequest.of(0, MAX_CANDIDATE_FOODS));

        SearchHits<FoodDocument> hits = elasticsearchOperations.search(queryBuilder.build(), FoodDocument.class);

        if (hits.isEmpty()) {
            return Page.empty(PageRequest.of(page, size));
        }

        // 2. TÍNH KHOẢNG CÁCH THỰC TẾ & CHUYỂN ĐỔI SANG DTO
        List<FoodSearchResponse> candidates = hits.getSearchHits().stream().map(hit -> {
            FoodDocument doc = hit.getContent();
            Double distanceKm = null;
            if (doc.getRestaurantLocation() != null) {
                distanceKm = calculateHaversineKm(
                        latitude, longitude,
                        doc.getRestaurantLocation().getLat(),
                        doc.getRestaurantLocation().getLon());
            }

            List<FoodSearchResponse.OptionItem> optionResponses = doc.getOptions() != null
                    ? doc.getOptions().stream().map(opt -> FoodSearchResponse.OptionItem.builder()
                    .size(opt.getSize())
                    .price(opt.getPrice())
                    .build()).toList()
                    : Collections.emptyList();

            return FoodSearchResponse.builder()
                    .id(doc.getId())
                    .name(doc.getName())
                    .restaurantId(doc.getRestaurantId())
                    .restaurantName(doc.getRestaurantName())
                    .restaurantAddress(doc.getRestaurantAddress())
                    .distanceKm(distanceKm)
                    .options(optionResponses)
                    .build();
        }).collect(Collectors.toList());

        // 3. TẦNG 2: THU THẬP PROFILE KHÁCH HÀNG TỪ MONGODB
        double avgPrice = 45000.0;
        int totalOrders = 0;
        if (customerId != null) {
            try {
                List<Trip> customerFoodTrips = tripRepository.findByCustomerIdAndShippingType(
                        customerId, ShippingType.FOOD_DELIVERY);
                totalOrders = customerFoodTrips.size();
                if (!customerFoodTrips.isEmpty()) {
                    avgPrice = customerFoodTrips.stream()
                            .mapToDouble(t -> t.getTotalFoodPrice() != null ? t.getTotalFoodPrice() : 45000.0)
                            .average().orElse(45000.0);
                }
            } catch (Exception e) {
                log.warn("[FoodRecommender] Không thể lấy lịch sử đơn: {}", e.getMessage());
            }
        }

        // 4. CHUẨN BỊ FEATURE VECTOR GỬI SANG AI SERVICE
        LocalDateTime now = LocalDateTime.now();
        List<FoodRecommendationRequest.CandidateFoodItem> aiCandidates = candidates.stream().map(c -> {
            double price = (c.getOptions() == null || c.getOptions().isEmpty())
                    ? 30000.0
                    : c.getOptions().get(0).getPrice();

            return FoodRecommendationRequest.CandidateFoodItem.builder()
                    .foodId(c.getId())
                    .foodName(c.getName())
                    .price(price)
                    .restaurantId(c.getRestaurantId())
                    .restaurantName(c.getRestaurantName())
                    .distanceKm(c.getDistanceKm() != null ? c.getDistanceKm() : 1.0)
                    .restaurantRating(4.8)
                    .build();
        }).toList();

        FoodRecommendationRequest aiRequest = new FoodRecommendationRequest(
                customerId != null ? customerId : UUID.randomUUID(),
                latitude,
                longitude,
                avgPrice,
                totalOrders,
                now.getHour(),
                now.getDayOfWeek().getValue(),
                aiCandidates
        );

        // 5. GỌI AI SERVICE (CÓ CHỐT CHẶN CIRCUIT BREAKER 50MS)
        Optional<FoodRecommendationResponse> aiResponse = foodRecommendationClient.rankFoods(aiRequest);

        List<FoodSearchResponse> finalRankedList;
        if (aiResponse.isPresent() && !aiResponse.get().rankedFoods().isEmpty()) {
            log.info("[FoodRecommender] Áp dụng xếp hạng AI Personalized Recommendation Model ({}, Model={})",
                    aiResponse.get().mealTimeSlot(), aiResponse.get().modelUsed());
            Map<String, FoodSearchResponse> candidateMap = candidates.stream()
                    .collect(Collectors.toMap(FoodSearchResponse::getId, c -> c));

            finalRankedList = new ArrayList<>();
            for (FoodRecommendationResponse.RankedFoodItem ranked : aiResponse.get().rankedFoods()) {
                FoodSearchResponse item = candidateMap.get(ranked.foodId());
                if (item != null) {
                    finalRankedList.add(item);
                }
            }
        } else {
            // FALLBACK: Sắp xếp theo khoảng cách tăng dần
            log.info("[FoodRecommender] Kích hoạt Fallback sắp xếp theo khoảng cách gần nhất");
            candidates.sort(Comparator.comparing(c -> c.getDistanceKm() != null ? c.getDistanceKm() : 999.0));
            finalRankedList = candidates;
        }

        // 6. PHÂN TRANG KẾT QUẢ TRẢ VỀ CHO CLIENT
        int start = Math.min(page * size, finalRankedList.size());
        int end = Math.min((page + 1) * size, finalRankedList.size());
        List<FoodSearchResponse> pagedList = finalRankedList.subList(start, end);

        return new PageImpl<>(pagedList, PageRequest.of(page, size), finalRankedList.size());
    }

    private double calculateHaversineKm(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c * 100.0) / 100.0;
    }
}
