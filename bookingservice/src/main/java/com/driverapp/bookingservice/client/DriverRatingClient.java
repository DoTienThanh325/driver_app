package com.driverapp.bookingservice.client;

import com.driverapp.bookingservice.config.HttpClientConfig;
import com.driverapp.bookingservice.exception.DependencyUnavailableException;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Slf4j
@Component
public class DriverRatingClient {
    private final RestClient restClient;

    public DriverRatingClient(
            HttpClientConfig httpClients,
            @Value("${services.feedback.base-url:http://feedbackservice}") String baseUrl) {
        this.restClient = httpClients.client("feedback", baseUrl, true);
    }

    public Double getAverageRating(UUID driverId) {
        try {
            DriverRating rating = restClient.get()
                    .uri("/internal/driver-ratings/{driverId}", driverId)
                    .retrieve()
                    .body(DriverRating.class);
            return rating == null ? null : rating.averageRating();
        } catch (RestClientException | DependencyUnavailableException ex) {
            log.warn("Could not load rating for driver {}: {}", driverId, ex.getClass().getSimpleName());
            return null;
        }
    }

    public record DriverRating(Double averageRating) {}
}
