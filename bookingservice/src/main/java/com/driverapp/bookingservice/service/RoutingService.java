package com.driverapp.bookingservice.service;

import java.util.List;

public interface RoutingService {

    /**
     * Tính toán thời gian di chuyển (ETA) từ nhiều tài xế đến 1 điểm khách đón (1-to-N).
     * @param pickupLat Vĩ độ đón khách
     * @param pickupLng Kinh độ đón khách
     * @param driverCoords Danh sách cặp tọa độ tài xế [lat, lng]
     * @return Danh sách ETA tương ứng (tính bằng phút)
     */
    List<Double> calculateEtasToPickup(double pickupLat, double pickupLng, List<double[]> driverCoords);
}
