package com.driverapp.paymentservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateDriverPaymentInfoRequest {

    @NotBlank(message = "bankName không được để trống")
    private String bankName;

    @NotBlank(message = "bankBin không được để trống (Mã BIN ngân hàng)")
    private String bankBin;

    @NotBlank(message = "bankAccountNumber không được để trống")
    private String bankAccountNumber;

    @NotBlank(message = "bankAccountName không được để trống")
    private String bankAccountName;
}
