package com.driverapp.bookingservice.models.enums;

public enum TripStatus {
    REQUESTED,
    SEARCHING_DRIVER,
    DRIVER_ASSIGNED,
    DRIVER_ARRIVING,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED,
    NO_DRIVER_FOUND
}