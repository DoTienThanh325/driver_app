package com.driverapp.bookingservice.client;

import com.driverapp.bookingservice.dto.ai.DriverScoringRequest;
import com.driverapp.bookingservice.dto.ai.DriverScoringResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import com.driverapp.bookingservice.config.HttpClientConfig;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Optional;

@Slf4j
@Component
public class AiMatchingClient {

    private final RestClient restClient;
    private final io.micrometer.core.instrument.MeterRegistry meters;

    public AiMatchingClient(HttpClientConfig httpClients, io.micrometer.core.instrument.MeterRegistry meters, @Value("${services.ai-matching.url:http://localhost:8087}") String aiServiceUrl) {
        this.meters = meters;
        this.restClient = httpClients.client("ai-matching", aiServiceUrl, false);
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
            meters.counter("dependency.fallback", "dependency", "ai-matching").increment();
            log.warn("[AI Client] Không thể chấm điểm qua AI Service ({}). Kích hoạt Rule-based Fallback.", e.getMessage());
            return Optional.empty(); // Kích hoạt Fallback
        }
    }
}
