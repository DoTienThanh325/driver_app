package com.driverapp.bookingservice.controller;

import com.driverapp.bookingservice.dto.request.RegisterBusinessRequest;
import com.driverapp.bookingservice.dto.request.ReviewBusinessRequest;
import com.driverapp.bookingservice.dto.response.RegisterBusinessResponse;
import com.driverapp.bookingservice.models.BusinessRegistration;
import com.driverapp.bookingservice.models.enums.BusinessRegistrationStatus;
import com.driverapp.bookingservice.service.BusinessRegistrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/businesses")
@RequiredArgsConstructor
public class BusinessRegistrationController {
    
    private final BusinessRegistrationService businessRegistrationService;

    /**
     * POST /api/business-registrations
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

        return businessRegistrationService.register(userId, request);
    }

    /**
     * GET /api/business-registrations/me
     * Customer xem đơn của mình (trả về 1 đơn duy nhất).
     */
    @GetMapping("/me")
    public BusinessRegistration getMyRegistration(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return businessRegistrationService.getMyRegistration(userId);
    }

    /**
     * GET /api/business-registrations?status=PENDING
     * Admin xem danh sách đơn theo trạng thái.
     */
    @GetMapping
    public List<BusinessRegistration> listByStatus(
            @RequestParam(defaultValue = "PENDING") BusinessRegistrationStatus status) {
        return businessRegistrationService.listByStatus(status);
    }

    /**
     * PATCH /api/business-registrations/{id}/review
     * Admin duyệt hoặc từ chối đơn (1 API gộp).
     * Body JSON: { "status": "ACCEPTED" } hoặc { "status": "REJECTED", "rejectReason": "..." }
     */
    @PatchMapping("/{id}/review")
    public BusinessRegistration review(
            @PathVariable String id,
            @Valid @RequestBody ReviewBusinessRequest request) {
        return businessRegistrationService.review(id, request);
    }
}
