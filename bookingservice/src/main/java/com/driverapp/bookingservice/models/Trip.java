package com.driverapp.bookingservice.models;

import com.driverapp.bookingservice.models.enums.ShippingType;
import com.driverapp.bookingservice.models.enums.TripStatus;
import com.driverapp.bookingservice.models.enums.VehicleType;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@NoArgsConstructor
@Document(collection = "trips")
public class Trip {

    @Id
    private UUID id;

    private double pickUpLatitude;
    private double pickUpLongitude;
    private String pickUpAddress;

    private String destinationAddress;
    private double destinationLongitude;
    private double destinationLatitude;

    private ShippingType shippingType;
    private VehicleType vehicleType;

    private UUID customerId;
    private UUID driverId;

    private UUID foodId;
    private Double foodPrice;

    private double shippFare;
    private TripStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}