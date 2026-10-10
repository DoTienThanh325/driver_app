package com.driverapp.paymentservice.controller;

import com.driverapp.paymentservice.dto.request.ClaimVoucherRequest;
import com.driverapp.paymentservice.dto.request.CreateVoucherRequest;
import com.driverapp.paymentservice.dto.response.VoucherItemResponse;
import com.driverapp.paymentservice.models.enums.VoucherType;
import com.driverapp.paymentservice.service.VoucherService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/vouchers")
@RequiredArgsConstructor
public class VoucherController {

    private final VoucherService voucherService;

    /**
     * POST /api/vouchers
     * Admin hoặc Business phát hành voucher
     * Output: Chỉ trả về message thành công
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> createVoucher(
            @Valid @RequestBody CreateVoucherRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return voucherService.createVoucher(request, jwt);
    }

    /**
     * POST /api/vouchers/claim
     * Customer nhận voucher và lưu vào user_vouchers
     * Role CUSTOMER được xác thực và chặn ở API Gateway, không dùng @PreAuthorize ở
     * controller
     */
    @PostMapping("/claim")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, String> claimVoucher(
            @Valid @RequestBody ClaimVoucherRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return voucherService.claimVoucher(request, jwt);
    }

    /**
     * GET /api/vouchers/app?type=FOOD
     * Customer xem danh sách voucher hợp lệ của App
     */
    @GetMapping("/app")
    public List<VoucherItemResponse> getAppVouchers(
            @RequestParam(required = false) VoucherType type,
            @AuthenticationPrincipal Jwt jwt) {
        return voucherService.getAppVouchersForCustomer(type, jwt);
    }

    /**
     * GET /api/vouchers/restaurants/{restaurantId}
     * Customer xem danh sách voucher của Nhà hàng (số lượng do nhà hàng cung cấp)
     */
    @GetMapping("/restaurants/{restaurantId}")
    public List<VoucherItemResponse> getRestaurantVouchers(
            @PathVariable String restaurantId) {
        return voucherService.getRestaurantVouchers(restaurantId);
    }
}
