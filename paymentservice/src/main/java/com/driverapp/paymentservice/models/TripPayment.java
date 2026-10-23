package com.driverapp.paymentservice.models;

import com.driverapp.paymentservice.models.enums.PaymentMethod;
import com.driverapp.paymentservice.models.enums.TripPaymentStatus;
import com.driverapp.paymentservice.models.submodels.TripPaymentVoucher;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "trip_payments")
public class TripPayment {

    @Id
    private String id;

    private String tripId;
    private UUID customerId;
    private UUID driverId;

    private PaymentMethod method;
    private TripPaymentStatus status;

    private double shippFare;
    private Double totalFoodPrice;
    private double totalAmount;
    private double discountAmount;
    private double finalAmount;

    private List<TripPaymentVoucher> vouchers;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}