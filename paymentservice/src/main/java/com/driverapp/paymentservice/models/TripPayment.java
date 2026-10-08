package com.driverapp.paymentservice.models;

import com.driverapp.paymentservice.models.enums.PaymentMethod;
import com.driverapp.paymentservice.models.submodels.TripPaymentVoucher;

import java.time.LocalDateTime;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@NoArgsConstructor
@Document(collection = "trip_payments")
public class TripPayment {
    @Id
    private String id;

    private String tripId;
    private PaymentMethod method;
    private List<TripPaymentVoucher> vouchers;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}