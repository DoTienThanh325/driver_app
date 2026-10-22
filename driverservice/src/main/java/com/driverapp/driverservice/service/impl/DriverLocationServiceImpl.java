package com.driverapp.driverservice.service.impl;

import com.driverapp.driverservice.dto.request.UpdateDriverLocationRequest;
import com.driverapp.driverservice.dto.response.NearbyDriverResponse;
import com.driverapp.driverservice.models.Driver;
import com.driverapp.driverservice.models.DriverAvailability;
import com.driverapp.driverservice.models.DriverVehicle;
import com.driverapp.driverservice.models.enums.AvailabilityStatus;
import com.driverapp.driverservice.models.enums.VehicleType;
import com.driverapp.driverservice.models.enums.VerificationStatus;
import com.driverapp.driverservice.repository.DriverAvailabilityRepository;
import com.driverapp.driverservice.repository.DriverRepository;
import com.driverapp.driverservice.repository.DriverVehicleRepository;
import com.driverapp.driverservice.service.DriverLocationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Metrics;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.domain.geo.GeoReference;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DriverLocationServiceImpl implements DriverLocationService {

    private static final String GEO_KEY_PREFIX = "driver:locations:";
    private static final String META_KEY_PREFIX = "driver:meta:";
    private static final Duration HEARTBEAT_TTL = Duration.ofSeconds(60);

    private final RedisTemplate<String, Object> redisTemplate;
    private final DriverRepository driverRepository;
    private final DriverVehicleRepository vehicleRepository;
    private final DriverAvailabilityRepository availabilityRepository;

    @Override
    @Transactional(readOnly = true)
    public void updateLocation(UUID driverUserId, UpdateDriverLocationRequest request) {
        // 1. Kiểm tra tài xế có tồn tại và đã được duyệt (APPROVED)
        Driver driver = driverRepository.findByUserId(driverUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài xế"));

        if (driver.getVerificationStatus() != VerificationStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài xế chưa được phê duyệt hồ sơ");
        }

        // 2. Lấy loại phương tiện hoạt động của tài xế
        DriverVehicle vehicle = vehicleRepository.findFirstByDriverOrderByCreatedAtDesc(driver)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tài xế chưa đăng ký phương tiện"));

        VehicleType vehicleType = vehicle.getVehicleType();
        String memberKey = driverUserId.toString();
        Point point = new Point(request.longitude(), request.latitude());

        // 3. Cập nhật vị trí vào Redis GEO theo loại xe và key tổng ALL
        redisTemplate.opsForGeo().add(GEO_KEY_PREFIX + vehicleType.name(), point, memberKey);
        redisTemplate.opsForGeo().add(GEO_KEY_PREFIX + "ALL", point, memberKey);

        // 4. Lưu metadata và heartbeat để xác định tài xế còn online
        String metaKey = META_KEY_PREFIX + memberKey;
        Map<String, Object> metaData = new HashMap<>();
        metaData.put("lat", request.latitude());
        metaData.put("lng", request.longitude());
        metaData.put("heading", request.heading() != null ? request.heading() : 0.0);
        metaData.put("speed", request.speed() != null ? request.speed() : 0.0);
        metaData.put("vehicleType", vehicleType.name());
        metaData.put("updatedAt", Instant.now().toEpochMilli());

        redisTemplate.opsForHash().putAll(metaKey, metaData);
        redisTemplate.expire(metaKey, HEARTBEAT_TTL);

        log.debug("Updated GPS for driver {}: lat={}, lng={}, type={}", driverUserId, request.latitude(), request.longitude(), vehicleType);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NearbyDriverResponse> findNearbyDrivers(Double lat, Double lng, Double radiusKm, VehicleType vehicleType, Integer limit) {
        String geoKey = GEO_KEY_PREFIX + (vehicleType != null ? vehicleType.name() : "ALL");
        int maxResults = (limit != null && limit > 0) ? limit : 40;
        double radius = (radiusKm != null && radiusKm > 0) ? radiusKm : 3.0;

        // 1. Quét bán kính bằng Redis GEOSEARCH
        Point centerPoint = new Point(lng, lat);
        Distance searchRadius = new Distance(radius, Metrics.KILOMETERS);
        RedisGeoCommands.GeoSearchCommandArgs args = RedisGeoCommands.GeoSearchCommandArgs.newGeoSearchArgs()
                .includeDistance()
                .includeCoordinates()
                .sortAscending()
                .limit(maxResults);

        GeoResults<RedisGeoCommands.GeoLocation<Object>> geoResults = redisTemplate.opsForGeo()
                .search(geoKey, GeoReference.fromCoordinate(centerPoint), searchRadius, args);

        if (geoResults == null || geoResults.getContent().isEmpty()) {
            return Collections.emptyList();
        }

        List<NearbyDriverResponse> candidates = new ArrayList<>();

        for (var result : geoResults) {
            String driverUserIdStr = result.getContent().getName().toString();
            UUID driverUserId = UUID.fromString(driverUserIdStr);

            // 2. Kiểm tra heartbeat (Tài xế còn ping trong 60s gần nhất không?)
            Boolean hasHeartbeat = redisTemplate.hasKey(META_KEY_PREFIX + driverUserIdStr);
            if (Boolean.FALSE.equals(hasHeartbeat)) {
                continue; // Tài xế đã mất kết nối, bỏ qua
            }

            // 3. Kiểm tra trạng thái khả dụng (AVAILABLE)
            Driver driver = driverRepository.findByUserId(driverUserId).orElse(null);
            if (driver == null) continue;

            Optional<DriverAvailability> availability = availabilityRepository.findByDriver(driver);
            if (availability.isEmpty() || availability.get().getStatus() != AvailabilityStatus.AVAILABLE) {
                continue; // Tài xế đang bận chuyến (ON_TRIP) hoặc OFFLINE
            }

            double distance = result.getDistance().getValue();
            Point point = result.getContent().getPoint();

            candidates.add(new NearbyDriverResponse(
                    driverUserId,
                    point.getY(), // Latitude
                    point.getX(), // Longitude
                    Math.round(distance * 100.0) / 100.0, // Làm tròn 2 số thập phân km
                    vehicleType
            ));
        }

        return candidates;
    }
}
