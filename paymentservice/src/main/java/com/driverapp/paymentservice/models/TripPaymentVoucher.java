package com.driverapp.paymentservice.models;

import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class TripPaymentVoucher {
    private UUID voucherId;
}