package com.driverapp.feedbackservice.controller;

import com.driverapp.feedbackservice.repository.UserFeedbackRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/driver-ratings")
@RequiredArgsConstructor
public class DriverRatingController {
    private final UserFeedbackRepository userFeedbackRepository;

    @GetMapping("/{driverId}")
    public DriverRating getDriverRating(@PathVariable UUID driverId) {
        return new DriverRating(userFeedbackRepository.calculateAverageRatingByDriverId(driverId));
    }

    public record DriverRating(Double averageRating) {}
}
