package com.driverapp.bookingservice.client;

import com.driverapp.bookingservice.dto.ai.FoodRecommendationRequest;
import com.driverapp.bookingservice.dto.ai.FoodRecommendationResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Optional;

@Slf4j
@Component
public class FoodRecommendationClient {

    private final RestClient restClient;

    public FoodRecommendationClient(@Value("${services.ai-matching.url:http://localhost:8087}") String aiServiceUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(30)); // 30ms bắt tay socket
        factory.setReadTimeout(Duration.ofMillis(50));    // 50ms ngắt mạch bảo vệ hệ thống (Circuit Breaker)

        this.restClient = RestClient.builder()
                .baseUrl(aiServiceUrl)
                .requestFactory(factory)
                .build();
    }

    public Optional<FoodRecommendationResponse> rankFoods(FoodRecommendationRequest request) {
        try {
            FoodRecommendationResponse response = restClient.post()
                    .uri("/api/v1/recommendation/rank")
                    .body(request)
                    .retrieve()
                    .body(FoodRecommendationResponse.class);

            return Optional.ofNullable(response);
        } catch (Exception e) {
            log.warn("[Food AI Client] Không thể kết nối tới AI Recommendation Service ({}). Kích hoạt Fallback.", e.getMessage());
            return Optional.empty();
        }
    }
}
