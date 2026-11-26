package com.driverapp.paymentservice;

import com.driverapp.paymentservice.client.BookingServiceClient;
import com.driverapp.paymentservice.dto.request.ClaimVoucherRequest;
import com.driverapp.paymentservice.dto.request.CreateVoucherRequest;
import com.driverapp.paymentservice.dto.response.UserVoucherResponse;
import com.driverapp.paymentservice.dto.response.VoucherItemResponse;
import com.driverapp.paymentservice.models.UserVoucher;
import com.driverapp.paymentservice.models.Voucher;
import com.driverapp.paymentservice.models.enums.VoucherProviderType;
import com.driverapp.paymentservice.models.enums.VoucherType;
import com.driverapp.paymentservice.repository.UserVoucherRepository;
import com.driverapp.paymentservice.repository.VoucherRepository;
import com.driverapp.paymentservice.service.impl.VoucherServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VoucherFlowScenariosTest {

    @Mock
    private VoucherRepository voucherRepository;
    @Mock
    private UserVoucherRepository userVoucherRepository;
    @Mock
    private BookingServiceClient bookingServiceClient;

    private VoucherServiceImpl voucherService;

    private final Map<String, Voucher> voucherStore = new HashMap<>();
    private final Map<UUID, UserVoucher> userVoucherStore = new HashMap<>();

    private final UUID adminId = UUID.randomUUID();
    private final UUID businessId = UUID.randomUUID();
    private final UUID customerId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        voucherService = new VoucherServiceImpl(voucherRepository, userVoucherRepository, bookingServiceClient);

        lenient().when(voucherRepository.save(any(Voucher.class))).thenAnswer(inv -> {
            Voucher v = inv.getArgument(0);
            if (v.getId() == null) {
                v.setId("v-" + (voucherStore.size() + 1));
            }
            voucherStore.put(v.getId(), v);
            return v;
        });
        lenient().when(voucherRepository.findById(anyString())).thenAnswer(inv ->
                Optional.ofNullable(voucherStore.get(inv.getArgument(0))));
        lenient().when(voucherRepository.findAllById(anyIterable())).thenAnswer(inv -> {
            Iterable<String> ids = inv.getArgument(0);
            java.util.List<Voucher> result = new java.util.ArrayList<>();
            for (String id : ids) {
                if (voucherStore.containsKey(id)) {
                    result.add(voucherStore.get(id));
                }
            }
            return result;
        });
        lenient().when(voucherRepository.findByProviderTypeAndExpiredAtAfter(any(), any())).thenAnswer(inv -> {
            VoucherProviderType pt = inv.getArgument(0);
            LocalDateTime now = inv.getArgument(1);
            return voucherStore.values().stream()
                    .filter(v -> v.getProviderType() == pt && v.getExpiredAt() != null && v.getExpiredAt().isAfter(now))
                    .toList();
        });
        lenient().when(voucherRepository.findByProviderTypeAndTypeAndExpiredAtAfter(any(), any(), any())).thenAnswer(inv -> {
            VoucherProviderType pt = inv.getArgument(0);
            VoucherType type = inv.getArgument(1);
            LocalDateTime now = inv.getArgument(2);
            return voucherStore.values().stream()
                    .filter(v -> v.getProviderType() == pt && v.getType() == type
                            && v.getExpiredAt() != null && v.getExpiredAt().isAfter(now))
                    .toList();
        });
        lenient().when(voucherRepository.findByProviderTypeAndRestaurantIdAndExpiredAtAfter(any(), anyString(), any()))
                .thenAnswer(inv -> {
                    VoucherProviderType pt = inv.getArgument(0);
                    String restId = inv.getArgument(1);
                    LocalDateTime now = inv.getArgument(2);
                    return voucherStore.values().stream()
                            .filter(v -> v.getProviderType() == pt && restId.equals(v.getRestaurantId())
                                    && v.getExpiredAt() != null && v.getExpiredAt().isAfter(now))
                            .toList();
                });

        lenient().when(userVoucherRepository.findByUserId(any(UUID.class))).thenAnswer(inv ->
                Optional.ofNullable(userVoucherStore.get(inv.getArgument(0))));
        lenient().when(userVoucherRepository.save(any(UserVoucher.class))).thenAnswer(inv -> {
            UserVoucher uv = inv.getArgument(0);
            if (uv.getId() == null) {
                uv.setId("uv-" + (userVoucherStore.size() + 1));
            }
            userVoucherStore.put(uv.getUserId(), uv);
            return uv;
        });
    }

    // Kịch bản 1: Admin phát hành voucher App -> Customer lọc theo số chuyến hoàn thành -> Claim cộng dồn -> Xem ví
    @Test
    void appVoucherFlow_adminCreates_customerFiltersClaimsAndViewsMyVouchers() {
        Jwt adminJwt = jwtWithRoles(adminId, List.of("ADMIN"));
        Jwt customerJwt = jwtWithRoles(customerId, List.of("CUSTOMER"));

        // Bước 1: Admin phát hành 2 voucher App (1 không minValue, 1 có minValue)
        Map<String, String> res1 = voucherService.createVoucher(CreateVoucherRequest.builder()
                .discount(15.0).maxDiscount(20_000.0).minValue(0.0)
                .type(VoucherType.FOOD).expiredAt(LocalDateTime.now().plusDays(7)).build(), adminJwt);
        Map<String, String> res2 = voucherService.createVoucher(CreateVoucherRequest.builder()
                .discount(25.0).maxDiscount(50_000.0).minValue(100_000.0)
                .type(VoucherType.TRANSIT).expiredAt(LocalDateTime.now().plusDays(7)).build(), adminJwt);
        assertEquals("Tạo voucher thành công", res1.get("message"));
        assertEquals("Tạo voucher thành công", res2.get("message"));

        // Bước 2: Khách hàng mới (0 chuyến hoàn thành) -> chỉ thấy voucher không có minValue (claimableCount = 1)
        when(bookingServiceClient.getCustomerCompletedTripsCount(customerId)).thenReturn(0L);
        List<VoucherItemResponse> newCustomerVouchers = voucherService.getAppVouchersForCustomer(null, customerJwt);
        assertEquals(1, newCustomerVouchers.size());
        assertEquals(1, newCustomerVouchers.get(0).getClaimableCount());
        String freeVoucherId = newCustomerVouchers.get(0).getId();

        // Bước 3: Khách hàng đã hoàn thành 3 chuyến -> thấy cả 2 voucher với claimableCount = 3
        when(bookingServiceClient.getCustomerCompletedTripsCount(customerId)).thenReturn(3L);
        List<VoucherItemResponse> loyalVouchers = voucherService.getAppVouchersForCustomer(null, customerJwt);
        assertEquals(2, loyalVouchers.size());
        assertTrue(loyalVouchers.stream().allMatch(v -> v.getClaimableCount() == 3));

        // Lọc riêng loại TRANSIT -> chỉ ra 1 voucher
        assertEquals(1, voucherService.getAppVouchersForCustomer(VoucherType.TRANSIT, customerJwt).size());

        // Bước 4: Claim voucher free 2 lần (1 + 2 = 3) -> cộng dồn trong ví và biến mất khỏi danh sách voucher mới
        voucherService.claimVoucher(ClaimVoucherRequest.builder().voucherId(freeVoucherId).numberOfVouchers(1).build(), customerJwt);
        voucherService.claimVoucher(ClaimVoucherRequest.builder().voucherId(freeVoucherId).numberOfVouchers(2).build(), customerJwt);

        List<UserVoucherResponse> myVouchers = voucherService.getMyVouchers(customerJwt);
        assertEquals(1, myVouchers.size());
        assertEquals(freeVoucherId, myVouchers.get(0).getId());
        assertEquals(3, myVouchers.get(0).getQuantity());

        List<VoucherItemResponse> remainingAppVouchers = voucherService.getAppVouchersForCustomer(null, customerJwt);
        assertEquals(1, remainingAppVouchers.size());
        assertNotEquals(freeVoucherId, remainingAppVouchers.get(0).getId());
    }

    // Kịch bản 2: Business phát hành voucher Nhà hàng -> Customer xem voucher nhà hàng & claim -> lọc voucher hết hạn ở ví
    @Test
    void restaurantVoucherFlow_businessCreates_customerViewsAndClaims() {
        Jwt businessJwt = jwtWithScope(businessId, "ROLE_BUSINESS");
        Jwt customerJwt = jwtWithRoles(customerId, List.of("CUSTOMER"));

        when(bookingServiceClient.getRestaurantIdByUserId(businessId)).thenReturn("rest-99");

        // Business tạo voucher FOOD
        voucherService.createVoucher(CreateVoucherRequest.builder()
                .discount(20.0).maxDiscount(30_000.0).minValue(50_000.0)
                .type(VoucherType.FOOD).numberOfVouchersPerCus(2)
                .expiredAt(LocalDateTime.now().plusDays(10)).build(), businessJwt);

        // Customer xem voucher của nhà hàng rest-99
        List<VoucherItemResponse> restVouchers = voucherService.getRestaurantVouchers("rest-99");
        assertEquals(1, restVouchers.size());
        assertEquals(VoucherProviderType.RESTAURANT, restVouchers.get(0).getProviderType());
        assertEquals("rest-99", restVouchers.get(0).getRestaurantId());
        assertEquals(2, restVouchers.get(0).getClaimableCount());

        // Customer claim về ví
        String restVoucherId = restVouchers.get(0).getId();
        voucherService.claimVoucher(ClaimVoucherRequest.builder().voucherId(restVoucherId).numberOfVouchers(2).build(), customerJwt);
        assertEquals(1, voucherService.getMyVouchers(customerJwt).size());

        // Nếu voucher hết hạn sau đó -> getMyVouchers tự lọc bỏ
        voucherStore.get(restVoucherId).setExpiredAt(LocalDateTime.now().minusMinutes(5));
        assertTrue(voucherService.getMyVouchers(customerJwt).isEmpty());
    }

    // Kịch bản 3: Chặn sai quyền và dữ liệu không hợp lệ trong luồng Voucher
    @Test
    void voucherFlow_authorizationAndValidationErrors() {
        Jwt customerJwt = jwtWithRoles(customerId, List.of("CUSTOMER"));
        Jwt businessJwt = jwtWithRoles(businessId, List.of("BUSINESS"));

        // Customer không được phép tạo voucher -> 403
        ResponseStatusException forbiddenEx = assertThrows(ResponseStatusException.class,
                () -> voucherService.createVoucher(CreateVoucherRequest.builder()
                        .discount(10.0).maxDiscount(10_000.0).minValue(0.0)
                        .type(VoucherType.FOOD).expiredAt(LocalDateTime.now().plusDays(1)).build(), customerJwt));
        assertEquals(HttpStatus.FORBIDDEN, forbiddenEx.getStatusCode());

        // Business tạo voucher TRANSIT -> 400
        ResponseStatusException wrongTypeEx = assertThrows(ResponseStatusException.class,
                () -> voucherService.createVoucher(CreateVoucherRequest.builder()
                        .discount(10.0).maxDiscount(10_000.0).minValue(0.0)
                        .type(VoucherType.TRANSIT).numberOfVouchersPerCus(1)
                        .expiredAt(LocalDateTime.now().plusDays(1)).build(), businessJwt));
        assertEquals(HttpStatus.BAD_REQUEST, wrongTypeEx.getStatusCode());

        // Business thiếu numberOfVouchersPerCus -> 400
        ResponseStatusException missingCountEx = assertThrows(ResponseStatusException.class,
                () -> voucherService.createVoucher(CreateVoucherRequest.builder()
                        .discount(10.0).maxDiscount(10_000.0).minValue(0.0)
                        .type(VoucherType.FOOD).numberOfVouchersPerCus(0)
                        .expiredAt(LocalDateTime.now().plusDays(1)).build(), businessJwt));
        assertEquals(HttpStatus.BAD_REQUEST, missingCountEx.getStatusCode());

        // Claim voucher không tồn tại -> 400
        ResponseStatusException notExistEx = assertThrows(ResponseStatusException.class,
                () -> voucherService.claimVoucher(ClaimVoucherRequest.builder()
                        .voucherId("missing-id").numberOfVouchers(1).build(), customerJwt));
        assertEquals(HttpStatus.BAD_REQUEST, notExistEx.getStatusCode());

        // Claim voucher đã hết hạn -> 400
        voucherStore.put("v-old", Voucher.builder()
                .id("v-old").discount(10.0).maxDiscount(10_000.0).minValue(0.0)
                .expiredAt(LocalDateTime.now().minusDays(1)).build());
        ResponseStatusException expiredEx = assertThrows(ResponseStatusException.class,
                () -> voucherService.claimVoucher(ClaimVoucherRequest.builder()
                        .voucherId("v-old").numberOfVouchers(1).build(), customerJwt));
        assertEquals(HttpStatus.BAD_REQUEST, expiredEx.getStatusCode());
    }

    private Jwt jwtWithRoles(UUID subject, List<String> roles) {
        return Jwt.withTokenValue("mock-token")
                .header("alg", "none")
                .subject(subject.toString())
                .claim("roles", roles)
                .build();
    }

    private Jwt jwtWithScope(UUID subject, String scope) {
        return Jwt.withTokenValue("mock-token")
                .header("alg", "none")
                .subject(subject.toString())
                .claim("scope", scope)
                .build();
    }
}
