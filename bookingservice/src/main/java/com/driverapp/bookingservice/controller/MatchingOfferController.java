package com.driverapp.bookingservice.controller;

import com.driverapp.bookingservice.service.MatchingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/matching-offers")
@RequiredArgsConstructor
public class MatchingOfferController {

    private final MatchingService matchingService;

    /**
     * Tài xế chủ động từ chối lời mời (Mobile App).
     * Hệ thống sẽ lập tức chuyển sang ứng viên kế tiếp mà không cần đợi hết 12s.
     */
    @PostMapping("/{offerId}/reject")
    public ResponseEntity<Map<String, String>> rejectOffer(@PathVariable String offerId) {
        matchingService.rejectOffer(offerId);
        return ResponseEntity.ok(Map.of("message", "Đã từ chối lời mời"));
    }
}
