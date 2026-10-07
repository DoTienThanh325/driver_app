package com.driverapp.bookingservice.controller;

import com.driverapp.bookingservice.dto.request.RegisterBusinessRequest;
import com.driverapp.bookingservice.dto.request.ReviewBusinessRequest;
import com.driverapp.bookingservice.dto.response.RegisterBusinessResponse;
import com.driverapp.bookingservice.models.Business;
import com.driverapp.bookingservice.models.enums.BusinessRegistrationStatus;
import com.driverapp.bookingservice.service.BusinessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("/api/businesses")
@RequiredArgsConstructor
public class BusinessRegistrationController {
    
    private final BusinessService businessService;

    /**
     * POST /api/businesses
     * multipart/form-data: text fields (tên, địa chỉ nhà hàng) + files (ảnh giấy phép)
     */
    @PostMapping(value = "/registration", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterBusinessResponse register(
            @RequestParam String restaurantName,
            @RequestParam String restaurantAddress,
            @RequestParam double restaurantLatitude,
            @RequestParam double restaurantLongitude,
            @RequestPart List<MultipartFile> businessLicenseImages,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = UUID.fromString(jwt.getSubject());
        RegisterBusinessRequest request = new RegisterBusinessRequest(
                restaurantName, restaurantAddress,
                restaurantLatitude, restaurantLongitude,
                businessLicenseImages);

        return businessService.register(userId, request);
    }

    /**
     * GET /api/businesses/me
     * Customer xem đơn của mình (trả về 1 đơn duy nhất).
     */
    @GetMapping("/me")
    public Business getMyBusiness(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return businessService.getMyBusiness(userId);
    }

    /**
     * GET /api/businesses?status=PENDING
     * Admin xem danh sách đơn theo trạng thái.
     */
    @GetMapping
    public List<Business> listByStatus(
            @RequestParam(defaultValue = "PENDING") BusinessRegistrationStatus status) {
        return businessService.listByStatus(status);
    }

    /**
     * PATCH /api/businesses/{id}/status
     * Admin duyệt hoặc từ chối đơn (1 API gộp).
     * Body JSON: { "status": "ACCEPTED" } hoặc { "status": "REJECTED", "rejectReason": "..." }
     */
    @PatchMapping("/{id}/status")
    public Map<String, String> updateStatus(
            @PathVariable String id,
            @Valid @RequestBody ReviewBusinessRequest request) {
        return businessService.updateStatus(id, request);
    }
}
