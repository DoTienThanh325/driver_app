package com.driverapp.paymentservice.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClaimVoucherRequest {

    @NotBlank(message = "voucherId không được để trống")
    private String voucherId;

    @NotNull(message = "numberOfVouchers không được để null")
    @Min(value = 1, message = "Số lượng voucher tối thiểu phải là 1")
    private Integer numberOfVouchers;
}
