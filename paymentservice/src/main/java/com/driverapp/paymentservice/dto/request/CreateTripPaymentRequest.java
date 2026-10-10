package com.driverapp.paymentservice.dto.request;

import com.driverapp.paymentservice.models.enums.PaymentMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTripPaymentRequest {

    @NotBlank(message = "tripId không được để trống")
    private String tripId;

    @NotNull(message = "method không được để trống (PAY_AFTER hoặc PAY_BEFORE)")
    private PaymentMethod method;

    private List<String> voucherIds;
}
