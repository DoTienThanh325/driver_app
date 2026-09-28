package com.driverapp.paymentservice.models;

import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UserVoucherItem {
    private UUID voucherId;
    private int numberOfVouchers;
}