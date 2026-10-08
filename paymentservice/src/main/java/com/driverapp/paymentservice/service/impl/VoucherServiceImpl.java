package com.driverapp.paymentservice.service.impl;

import com.driverapp.paymentservice.client.BookingServiceClient;
import com.driverapp.paymentservice.dto.request.CreateVoucherRequest;
import com.driverapp.paymentservice.dto.response.VoucherItemResponse;
import com.driverapp.paymentservice.models.Voucher;
import com.driverapp.paymentservice.models.enums.VoucherProviderType;
import com.driverapp.paymentservice.models.enums.VoucherType;
import com.driverapp.paymentservice.repository.VoucherRepository;
import com.driverapp.paymentservice.service.VoucherService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@Service
@RequiredArgsConstructor
public class VoucherServiceImpl implements VoucherService {

    private final VoucherRepository voucherRepository;
    private final BookingServiceClient bookingServiceClient;

    @Override
    public Map<String, String> createVoucher(CreateVoucherRequest request, Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        Collection<String> roles = extractRoles(jwt);

        VoucherProviderType determinedProviderType;
        String resolvedRestaurantId = null;
        Integer resolvedNumberOfVouchersPerCus = null;

        // 1. Service tự kiểm tra Role để xác định providerType
        if (hasRole(roles, "ADMIN")) {
            determinedProviderType = VoucherProviderType.APP;
            // Admin tạo voucher APP toàn sàn
        } else if (hasRole(roles, "BUSINESS")) {
            determinedProviderType = VoucherProviderType.RESTAURANT;

            // Voucher của Business chỉ dành cho giao đồ ăn (FOOD)
            if (request.getType() != VoucherType.FOOD) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Voucher của Nhà hàng chỉ có thể áp dụng cho đồ ăn (FOOD)");
            }

            if (request.getNumberOfVouchersPerCus() == null || request.getNumberOfVouchersPerCus() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Đối tác kinh doanh bắt buộc phải nhập numberOfVouchersPerCus > 0");
            }

            // Gọi bookingservice để lấy restaurantId theo userId của Business (Internal call, không cần JWT)
            resolvedRestaurantId = bookingServiceClient.getRestaurantIdByUserId(userId);
            resolvedNumberOfVouchersPerCus = request.getNumberOfVouchersPerCus();
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền phát hành voucher");
        }

        // 2. Khởi tạo đối tượng Voucher Entity
        Voucher voucher = Voucher.builder()
                .discount(request.getDiscount())
                .maxDiscount(request.getMaxDiscount())
                .minValue(request.getMinValue())
                .type(request.getType())
                .providerType(determinedProviderType)
                .restaurantId(resolvedRestaurantId)
                .numberOfVouchersPerCus(resolvedNumberOfVouchersPerCus)
                .expiredAt(request.getExpiredAt())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        // 3. Lưu vào Database (Không phát thông báo)
        voucherRepository.save(voucher);
        log.info("Voucher created with id={}, providerType={}, restaurantId={}",
                voucher.getId(), determinedProviderType, resolvedRestaurantId);

        // 4. Output: Chỉ trả về message tạo thành công
        return Map.of("message", "Tạo voucher thành công");
    }

    // ───────────────────────────── 1. VOUCHER CỦA APP (CHỈ TRẢ VỀ CÁC VOUCHER HỢP LỆ)
    @Override
    public List<VoucherItemResponse> getAppVouchersForCustomer(VoucherType type, Jwt jwt) {
        UUID customerId = UUID.fromString(jwt.getSubject());

        // Lấy số chuyến đi đã hoàn thành của Customer từ bookingservice (không cần JWT)
        long completedTrips = bookingServiceClient.getCustomerCompletedTripsCount(customerId);

        // Truy vấn tất cả voucher APP còn hạn
        LocalDateTime now = LocalDateTime.now();
        List<Voucher> appVouchers = (type != null)
                ? voucherRepository.findByProviderTypeAndTypeAndExpiredAtAfter(VoucherProviderType.APP, type, now)
                : voucherRepository.findByProviderTypeAndExpiredAtAfter(VoucherProviderType.APP, now);

        List<VoucherItemResponse> validVouchers = new ArrayList<>();

        for (Voucher voucher : appVouchers) {
            int claimableCount = 0;
            boolean hasMinValue = voucher.getMinValue() > 0;

            if (!hasMinValue) {
                // Voucher không có minValue: Mặc định mỗi người được tối thiểu 1 voucher
                claimableCount = Math.max(1, (int) completedTrips);
            } else {
                // Voucher có minValue: 1 chuyến = x1 voucher, chưa đi chuyến nào = 0
                if (completedTrips > 0) {
                    claimableCount = (int) completedTrips;
                }
            }

            // CHỈ TRẢ VỀ CÁC VOUCHER HỢP LỆ (claimableCount > 0)
            if (claimableCount > 0) {
                validVouchers.add(toResponse(voucher, claimableCount));
            }
        }

        return validVouchers;
    }

    // ───────────────────────────── 2. VOUCHER CỦA NHÀ HÀNG (DO NHÀ HÀNG QUY ĐỊNH)
    @Override
    public List<VoucherItemResponse> getRestaurantVouchers(String restaurantId) {
        LocalDateTime now = LocalDateTime.now();

        // Lấy danh sách voucher còn hạn của nhà hàng cụ thể
        List<Voucher> restaurantVouchers = voucherRepository
                .findByProviderTypeAndRestaurantIdAndExpiredAtAfter(
                        VoucherProviderType.RESTAURANT, restaurantId, now);

        return restaurantVouchers.stream()
                .map(v -> {
                    // Số lượng nhận phụ thuộc hoàn toàn vào số lượng nhà hàng cung cấp
                    int claimableCount = (v.getNumberOfVouchersPerCus() != null && v.getNumberOfVouchersPerCus() > 0)
                            ? v.getNumberOfVouchersPerCus()
                            : 1;

                    return toResponse(v, claimableCount);
                })
                .toList();
    }

    private VoucherItemResponse toResponse(Voucher v, int claimableCount) {
        return VoucherItemResponse.builder()
                .id(v.getId())
                .discount(v.getDiscount())
                .maxDiscount(v.getMaxDiscount())
                .minValue(v.getMinValue())
                .type(v.getType())
                .providerType(v.getProviderType())
                .restaurantId(v.getRestaurantId())
                .numberOfVouchersPerCus(v.getNumberOfVouchersPerCus())
                .expiredAt(v.getExpiredAt())
                .claimableCount(claimableCount)
                .build();
    }

    private boolean hasRole(Collection<String> roles, String roleName) {
        return roles.contains(roleName) || roles.contains("ROLE_" + roleName);
    }

    private Collection<String> extractRoles(Jwt jwt) {
        Object rolesClaim = jwt.getClaims().get("roles");
        if (rolesClaim instanceof Collection<?> list) {
            return list.stream().map(Object::toString).toList();
        }
        Object scopeClaim = jwt.getClaims().get("scope");
        if (scopeClaim instanceof String scopes) {
            return java.util.Arrays.asList(scopes.split(" "));
        }
        return Collections.emptyList();
    }
}
