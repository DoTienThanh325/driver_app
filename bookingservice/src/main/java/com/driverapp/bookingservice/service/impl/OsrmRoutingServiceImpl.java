package com.driverapp.bookingservice.service.impl;

import com.driverapp.bookingservice.dto.response.OsrmTableResponse;
import com.driverapp.bookingservice.service.RoutingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Slf4j
@Service("osrmRoutingService")
@RequiredArgsConstructor
public class OsrmRoutingServiceImpl implements RoutingService {

    private final RestClient restClient = RestClient.create();

    @Value("${services.osrm.url:http://localhost:5000}")
    private String osrmBaseUrl;

    /**
     * Tính toán thời gian di chuyển (ETA) từ nhiều tài xế đến 1 điểm khách đón (1-to-N).
     * @param pickupLat Vĩ độ đón khách
     * @param pickupLng Kinh độ đón khách
     * @param driverCoords Danh sách cặp tọa độ tài xế [lat, lng]
     * @return Danh sách ETA tương ứng (tính bằng phút)
     */
    @Override
    public List<Double> calculateEtasToPickup(double pickupLat, double pickupLng, List<double[]> driverCoords) {
        if (driverCoords == null || driverCoords.isEmpty()) {
            return List.of();
        }

        // Tọa độ 0: Điểm đón của khách
        // Tọa độ 1..N: Tọa độ các tài xế
        // Chú ý: OSRM nhận format {longitude},{latitude}
        StringBuilder coordsBuilder = new StringBuilder();
        coordsBuilder.append(pickupLng).append(",").append(pickupLat);

        for (double[] coord : driverCoords) {
            coordsBuilder.append(";").append(coord[1]).append(",").append(coord[0]);
        }

        // Destination là điểm 0 (khách), Sources là các tài xế (1..N)
        StringBuilder sourcesBuilder = new StringBuilder();
        for (int i = 1; i <= driverCoords.size(); i++) {
            if (i > 1) sourcesBuilder.append(";");
            sourcesBuilder.append(i);
        }

        String url = String.format("%s/table/v1/driving/%s?sources=%s&destinations=0&annotations=duration",
                osrmBaseUrl, coordsBuilder.toString(), sourcesBuilder.toString());

        try {
            OsrmTableResponse response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(OsrmTableResponse.class);

            if (response != null && response.durations() != null) {
                // durations[i][0] là số giây tài xế i di chuyển tới điểm khách
                return response.durations().stream()
                        .map(row -> row != null && !row.isEmpty() && row.get(0) != null 
                                ? Math.round((row.get(0) / 60.0) * 10.0) / 10.0 // chuyển sang phút 
                                : 999.0)
                        .toList();
            }
        } catch (Exception e) {
            log.error("Lỗi khi gọi OSRM Table API: {}", e.getMessage());
        }

        // Fallback ước tính nếu OSRM lỗi: giả sử tốc độ 30km/h
        return List.of();
    }
}
