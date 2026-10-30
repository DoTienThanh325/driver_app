package com.driverapp.bookingservice.controller;

import com.driverapp.bookingservice.dto.response.DriverOfferResponse;
import com.driverapp.bookingservice.service.MatchingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/matching-offers")
@RequiredArgsConstructor
public class MatchingOfferController {

    private final MatchingService matchingService;

    /**
     * GET /api/matching-offers/my-offers
     * Lấy danh sách cuốc xe tiềm năng mà AI đã gửi riêng cho tài xế này
     */
    @GetMapping("/my-offers")
    public ResponseEntity<List<DriverOfferResponse>> getMyPendingOffers(@AuthenticationPrincipal Jwt jwt) {
        UUID driverId = UUID.fromString(jwt.getSubject());
        List<DriverOfferResponse> offers = matchingService.getPendingOffersForDriver(driverId);
        return ResponseEntity.ok(offers);
    }

    /**
     * POST /api/matching-offers/{offerId}/reject
     * Tài xế chủ động từ chối lời mời trên Mobile App
     */
    @PostMapping("/{offerId}/reject")
    public ResponseEntity<Map<String, String>> rejectOffer(@PathVariable String offerId) {
        matchingService.rejectOffer(offerId);
        return ResponseEntity.ok(Map.of("message", "Đã từ chối lời mời"));
    }
}
