package com.driverapp.paymentservice.dto.response;

import com.driverapp.paymentservice.models.enums.VoucherProviderType;
import com.driverapp.paymentservice.models.enums.VoucherType;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserVoucherResponse {
    private String id;
    private double discount;
    private double maxDiscount;
    private double minValue;
    private VoucherType type;
    private VoucherProviderType providerType;
    private String restaurantId;
    private LocalDateTime expiredAt;

    /** Số lượng voucher mà User đang sở hữu thực tế */
    private int quantity;
}
