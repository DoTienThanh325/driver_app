package com.driverapp.bookingservice.client;

import com.driverapp.bookingservice.dto.ai.DriverScoringRequest;
import com.driverapp.bookingservice.dto.ai.DriverScoringResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Optional;

@Slf4j
@Component
public class AiMatchingClient {

    private final RestClient restClient;

    public AiMatchingClient(@Value("${services.ai-matching.url:http://localhost:8087}") String aiServiceUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(30)); // Timeout kết nối 30ms
        factory.setReadTimeout(Duration.ofMillis(50));    // Timeout đọc 50ms (Circuit Breaker)

        this.restClient = RestClient.builder()
                .baseUrl(aiServiceUrl)
                .requestFactory(factory)
                .build();
    }

    public Optional<DriverScoringResponse> scoreCandidates(DriverScoringRequest request) {
        try {
            DriverScoringResponse response = restClient.post()
                    .uri("/api/v1/matching/score")
                    .body(request)
                    .retrieve()
                    .body(DriverScoringResponse.class);

            return Optional.ofNullable(response);
        } catch (Exception e) {
            log.warn("[AI Client] Không thể chấm điểm qua AI Service ({}). Kích hoạt Rule-based Fallback.", e.getMessage());
            return Optional.empty(); // Kích hoạt Fallback
        }
    }
}
