package com.driverapp.paymentservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverPaymentInfoResponse {
    private String bankName;
    private String bankAccountNumber;
    private String bankAccountName;
}
