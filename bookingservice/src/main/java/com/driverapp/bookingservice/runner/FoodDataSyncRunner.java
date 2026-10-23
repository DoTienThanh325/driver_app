package com.driverapp.bookingservice.runner;

import com.driverapp.bookingservice.elasticsearch.repository.FoodSearchRepository;
import com.driverapp.bookingservice.repository.FoodRepository;
import com.driverapp.bookingservice.repository.RestaurantRepository;
import com.driverapp.bookingservice.service.FoodSearchService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class FoodDataSyncRunner implements CommandLineRunner {

    private final RestaurantRepository restaurantRepository;
    private final FoodRepository foodRepository;
    private final MongoTemplate mongoTemplate;
    private final FoodSearchRepository foodSearchRepository;
    private final FoodSearchService foodSearchService;

    @Override
    public void run(String... args) {
        try {
            // 1. Nạp dữ liệu nhà hàng nếu MongoDB đang rỗng
            seedRestaurantsIfEmpty();

            // 2. Nạp dữ liệu món ăn nếu MongoDB đang rỗng
            seedFoodsIfEmpty();

            // 3. Đồng bộ toàn bộ món ăn sang Elasticsearch nếu index đang rỗng
            long esCount = foodSearchRepository.count();
            if (esCount == 0) {
                log.info("Elasticsearch index foods_index đang rỗng. Bắt đầu tự động đồng bộ từ MongoDB...");
                foodSearchService.syncAllFoods();
            } else {
                log.info("Chỉ mục Elasticsearch đã có sẵn {} món ăn.", esCount);
            }
        } catch (Exception e) {
            log.warn("Không thể hoàn tất khởi tạo hoặc đồng bộ dữ liệu lúc khởi động: {}", e.getMessage());
        }
    }

    private void seedRestaurantsIfEmpty() {
        if (restaurantRepository.count() == 0) {
            log.info("Collection 'restaurants' trong MongoDB đang rỗng. Bắt đầu nạp từ db/restaurants.json...");
            loadJsonToCollection("db/restaurants.json", "restaurants");
        }
    }

    private void seedFoodsIfEmpty() {
        if (foodRepository.count() == 0) {
            log.info("Collection 'foods' trong MongoDB đang rỗng. Bắt đầu nạp từ db/foods.json...");
            loadJsonToCollection("db/foods.json", "foods");
        }
    }

    private void loadJsonToCollection(String resourcePath, String collectionName) {
        try {
            ClassPathResource resource = new ClassPathResource(resourcePath);
            if (!resource.exists()) {
                log.warn("File {} không tồn tại trong classpath", resourcePath);
                return;
            }
            String json = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            ObjectMapper mapper = new ObjectMapper();
            JsonNode rootNode = mapper.readTree(json);
            if (rootNode.isArray()) {
                List<Document> docs = new ArrayList<>();
                for (JsonNode node : rootNode) {
                    docs.add(Document.parse(node.toString()));
                }
                if (!docs.isEmpty()) {
                    mongoTemplate.getCollection(collectionName).insertMany(docs);
                    log.info("Đã nạp thành công {} documents vào collection '{}'", docs.size(), collectionName);
                }
            }
        } catch (Exception e) {
            log.error("Lỗi khi nạp dữ liệu từ {}: {}", resourcePath, e.getMessage(), e);
        }
    }
}
