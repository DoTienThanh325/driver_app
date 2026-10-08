package com.driverapp.paymentservice.dto.response;

import com.driverapp.paymentservice.models.enums.VoucherProviderType;
import com.driverapp.paymentservice.models.enums.VoucherType;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoucherItemResponse {
    private String id;
    private double discount;
    private double maxDiscount;
    private double minValue;
    private VoucherType type;
    private VoucherProviderType providerType;
    private String restaurantId;
    private Integer numberOfVouchersPerCus;
    private LocalDateTime expiredAt;

    /** Số lượng voucher khách hàng có thể nhận */
    private int claimableCount;
}
