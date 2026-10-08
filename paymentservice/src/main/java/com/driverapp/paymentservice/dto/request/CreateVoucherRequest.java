package com.driverapp.paymentservice.dto.request;

import com.driverapp.paymentservice.models.enums.VoucherType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateVoucherRequest {

    @NotNull(message = "discount không được để trống")
    @DecimalMin(value = "0.01", message = "discount phải lớn hơn 0%")
    @DecimalMax(value = "100.0", message = "discount tối đa 100%")
    private Double discount;

    @NotNull(message = "maxDiscount không được để trống")
    @Positive(message = "maxDiscount phải là số dương")
    private Double maxDiscount;

    @NotNull(message = "minValue không được để trống")
    @DecimalMin(value = "0.0", message = "minValue phải lớn hơn hoặc bằng 0")
    private Double minValue;

    @NotNull(message = "type không được để trống (FOOD hoặc TRANSIT)")
    private VoucherType type;

    @NotNull(message = "expiredAt không được để trống")
    @Future(message = "expiredAt phải là thời gian trong tương lai")
    private LocalDateTime expiredAt;

    /** Bắt buộc nếu caller là BUSINESS */
    private Integer numberOfVouchersPerCus;
}
