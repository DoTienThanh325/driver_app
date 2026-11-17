package com.driverapp.bookingservice.client;

import com.driverapp.bookingservice.dto.ai.FoodRecommendationRequest;
import com.driverapp.bookingservice.dto.ai.FoodRecommendationResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import com.driverapp.bookingservice.config.HttpClientConfig;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Optional;

@Slf4j
@Component
public class FoodRecommendationClient {

    private final RestClient restClient;
    private final io.micrometer.core.instrument.MeterRegistry meters;

    public FoodRecommendationClient(HttpClientConfig httpClients, io.micrometer.core.instrument.MeterRegistry meters, @Value("${services.ai-matching.url:http://localhost:8087}") String aiServiceUrl) {
        this.meters = meters;
        this.restClient = httpClients.client("ai-food", aiServiceUrl, false);
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
            meters.counter("dependency.fallback", "dependency", "ai-food").increment();
            log.warn("[Food AI Client] Không thể kết nối tới AI Recommendation Service ({}). Kích hoạt Fallback.", e.getMessage());
            return Optional.empty();
        }
    }
}
