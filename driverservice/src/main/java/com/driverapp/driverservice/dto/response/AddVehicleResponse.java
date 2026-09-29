package com.driverapp.driverservice.dto.response;

import com.driverapp.driverservice.models.enums.VehicleType;
import java.util.UUID;

public record AddVehicleResponse(
    UUID vehicleId,
    VehicleType vehicleType,
    String message
) {}