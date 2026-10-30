package com.driverapp.bookingservice.service.impl;

import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import com.driverapp.bookingservice.dto.request.FoodSearchRequest;
import com.driverapp.bookingservice.dto.response.FoodSearchResponse;
import com.driverapp.bookingservice.elasticsearch.document.FoodDocument;
import com.driverapp.bookingservice.elasticsearch.document.FoodOptionSubDoc;
import com.driverapp.bookingservice.elasticsearch.repository.FoodSearchRepository;
import com.driverapp.bookingservice.models.Food;
import com.driverapp.bookingservice.models.FoodOption;
import com.driverapp.bookingservice.models.Restaurant;
import com.driverapp.bookingservice.repository.FoodRepository;
import com.driverapp.bookingservice.repository.RestaurantRepository;
import com.driverapp.bookingservice.service.FoodSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.client.elc.NativeQueryBuilder;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.geo.GeoPoint;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FoodSearchServiceImpl implements FoodSearchService {

    private final ElasticsearchOperations elasticsearchOperations;
    private final FoodSearchRepository foodSearchRepository;
    private final FoodRepository foodRepository;
    private final RestaurantRepository restaurantRepository;

    @Override
    public Page<FoodSearchResponse> searchFoods(FoodSearchRequest request) {
        BoolQuery.Builder boolQuery = new BoolQuery.Builder();

        // 1. TÌM KIẾM CHỈ THEO TÊN MÓN ĂN
        if (request.getName() != null && !request.getName().isBlank()) {
            boolQuery.must(Query.of(q -> q.multiMatch(m -> m
                    .query(request.getName().trim())
                    .fields("name^3", "name.autocomplete^2")
                    .fuzziness("AUTO")
            )));
        } else {
            boolQuery.must(Query.of(q -> q.matchAll(m -> m)));
        }

        NativeQueryBuilder queryBuilder = new NativeQueryBuilder()
                .withQuery(Query.of(q -> q.bool(boolQuery.build())))
                .withPageable(PageRequest.of(request.getPage(), request.getSize()));

        // 2. BỘ LỌC BÁN KÍNH ĐỊA LÝ & SẮP XẾP THEO KHOẢNG CÁCH
        boolean hasUserLocation = request.getLatitude() != null && request.getLongitude() != null;
        if (hasUserLocation) {
            double radiusKm = (request.getRadiusKm() != null && request.getRadiusKm() > 0) ? request.getRadiusKm() : 5.0;

            boolQuery.filter(f -> f.geoDistance(g -> g
                    .field("restaurantLocation")
                    .distance(radiusKm + "km")
                    .location(l -> l.latlon(ll -> ll.lat(request.getLatitude()).lon(request.getLongitude())))
            ));

            queryBuilder.withSort(s -> s.geoDistance(g -> g
                    .field("restaurantLocation")
                    .location(l -> l.latlon(ll -> ll.lat(request.getLatitude()).lon(request.getLongitude())))
                    .order(SortOrder.Asc)
            ));
        }

        // 3. Thực thi truy vấn
        NativeQuery searchQuery = queryBuilder.build();
        SearchHits<FoodDocument> hits = elasticsearchOperations.search(searchQuery, FoodDocument.class);

        // 4. Map kết quả và tính khoảng cách (km) trả về cho client
        List<FoodSearchResponse> responses = hits.getSearchHits().stream().map(hit -> {
            FoodDocument doc = hit.getContent();
            Double distanceKm = null;
            if (hasUserLocation && doc.getRestaurantLocation() != null) {
                distanceKm = calculateDistance(
                        request.getLatitude(), request.getLongitude(),
                        doc.getRestaurantLocation().getLat(), doc.getRestaurantLocation().getLon()
                );
                distanceKm = Math.round(distanceKm * 100.0) / 100.0;
            }

            return FoodSearchResponse.builder()
                    .id(doc.getId())
                    .name(doc.getName())
                    .restaurantId(doc.getRestaurantId())
                    .restaurantName(doc.getRestaurantName())
                    .restaurantAddress(doc.getRestaurantAddress())
                    .distanceKm(distanceKm)
                    .options(doc.getOptions() == null ? Collections.emptyList() :
                            doc.getOptions().stream().map(opt -> FoodSearchResponse.OptionItem.builder()
                                    .size(opt.getSize())
                                    .price(opt.getPrice())
                                    .imageUrl(opt.getImageUrl())
                                    .build()).toList())
                    .build();
        }).toList();

        return new PageImpl<>(responses, PageRequest.of(request.getPage(), request.getSize()), hits.getTotalHits());
    }

    @Override
    public List<String> getSuggestions(String prefix) {
        if (prefix == null || prefix.trim().length() < 2) {
            return Collections.emptyList();
        }

        NativeQuery query = new NativeQueryBuilder()
                .withQuery(Query.of(q -> q.match(m -> m
                        .field("name.autocomplete")
                        .query(prefix.trim())
                )))
                .withPageable(PageRequest.of(0, 5))
                .build();

        SearchHits<FoodDocument> hits = elasticsearchOperations.search(query, FoodDocument.class);
        return hits.getSearchHits().stream()
                .map(h -> h.getContent().getName())
                .distinct()
                .toList();
    }

    // ------------------------------------------------------------------ SYNC LOGIC
    @Override
    public void syncFoodToElasticsearch(String foodId) {
        Food food = foodRepository.findById(foodId).orElse(null);
        if (food == null) {
            foodSearchRepository.deleteById(foodId);
            return;
        }

        Restaurant restaurant = restaurantRepository.findById(food.getRestaurantId()).orElse(null);

        List<FoodOptionSubDoc> optionSubDocs = new ArrayList<>();
        if (food.getOptions() != null) {
            for (FoodOption opt : food.getOptions()) {
                optionSubDocs.add(new FoodOptionSubDoc(opt.getSize(), opt.getPrice(), opt.getImageUrl()));
            }
        }

        GeoPoint location = null;
        String resName = "";
        String resAddress = "";
        if (restaurant != null) {
            location = new GeoPoint(restaurant.getLocationLatitude(), restaurant.getLocationLongitude());
            resName = restaurant.getName();
            resAddress = restaurant.getLocationAddress();
        }

        FoodDocument doc = FoodDocument.builder()
                .id(food.getId())
                .name(food.getName())
                .restaurantId(food.getRestaurantId())
                .restaurantName(resName)
                .restaurantAddress(resAddress)
                .restaurantLocation(location)
                .options(optionSubDocs)
                .createdAt(food.getCreatedAt() != null ? food.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME) : null)
                .build();

        foodSearchRepository.save(doc);
        log.info("Đã đồng bộ món ăn [{}] sang Elasticsearch", foodId);
    }

    @Override
    public void deleteFoodFromElasticsearch(String foodId) {
        foodSearchRepository.deleteById(foodId);
        log.info("Đã xoá món ăn [{}] khỏi Elasticsearch", foodId);
    }

    @Override
    public void syncAllFoods() {
        log.info("Bắt đầu đồng bộ toàn bộ món ăn từ MongoDB sang Elasticsearch...");
        List<Food> foods = foodRepository.findAll();
        for (Food food : foods) {
            syncFoodToElasticsearch(food.getId());
        }
        log.info("Hoàn tất đồng bộ {} món ăn sang Elasticsearch", foods.size());
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
