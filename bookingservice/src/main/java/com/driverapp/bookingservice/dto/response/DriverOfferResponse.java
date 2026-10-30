package com.driverapp.bookingservice.dto.response;

import com.driverapp.bookingservice.models.enums.ShippingType;
import com.driverapp.bookingservice.models.enums.VehicleType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class DriverOfferResponse {
    private String offerId;
    private String tripId;
    private String pickUpAddress;
    private double pickUpLatitude;
    private double pickUpLongitude;
    private String destinationAddress;
    private double destinationLatitude;
    private double destinationLongitude;
    private double distanceKm; // Khoảng cách từ tài xế đến điểm đón hoặc cự ly chuyến
    private double etaMinutes; // Thời gian tài xế tiếp cận điểm đón
    private double shippFare;  // Cước phí tài xế nhận
    private Double totalFoodPrice;
    private ShippingType shippingType;
    private VehicleType vehicleType;
    private int aiRank;        // Thứ hạng tiềm năng mà AI đánh giá
    private Boolean backToBack; // Cuốc xe gối đầu
    private LocalDateTime createdAt;
}
