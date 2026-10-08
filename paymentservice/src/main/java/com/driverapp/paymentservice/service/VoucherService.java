package com.driverapp.paymentservice.service;

import com.driverapp.paymentservice.dto.request.CreateVoucherRequest;
import com.driverapp.paymentservice.dto.response.VoucherItemResponse;
import com.driverapp.paymentservice.models.enums.VoucherType;
import java.util.List;
import java.util.Map;
import org.springframework.security.oauth2.jwt.Jwt;

public interface VoucherService {
    Map<String, String> createVoucher(CreateVoucherRequest request, Jwt jwt);

    /** 1. Khách hàng xem danh sách voucher của App hợp lệ (claimableCount > 0) */
    List<VoucherItemResponse> getAppVouchersForCustomer(VoucherType type, Jwt jwt);

    /** 2. Khách hàng xem danh sách voucher của Nhà hàng (số lượng do nhà hàng cung cấp) */
    List<VoucherItemResponse> getRestaurantVouchers(String restaurantId);
}
