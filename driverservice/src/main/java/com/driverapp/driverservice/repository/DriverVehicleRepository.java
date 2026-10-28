package com.driverapp.driverservice.repository;

import com.driverapp.driverservice.models.Driver;
import com.driverapp.driverservice.models.DriverVehicle;
import com.driverapp.driverservice.models.enums.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DriverVehicleRepository extends JpaRepository<DriverVehicle, UUID> {
    long countByDriver(Driver driver);

    List<DriverVehicle> findByDriver(Driver driver);

    List<DriverVehicle> findByDriverOrderByCreatedAtDesc(Driver driver);

    Optional<DriverVehicle> findFirstByDriverOrderByCreatedAtDesc(Driver driver);

    // Truy vấn trực tiếp theo userId
    long countByDriver_UserId(UUID userId);

    List<DriverVehicle> findByDriver_UserId(UUID userId);

    List<DriverVehicle> findByDriver_UserIdOrderByCreatedAtDesc(UUID userId);

    Optional<DriverVehicle> findFirstByDriver_UserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Cập nhật toàn bộ xe của driver từ status cũ sang status mới.
     * Dùng khi admin approve hồ sơ: PENDING → APPROVED.
     */
    @Modifying
    @Query("UPDATE DriverVehicle v SET v.status = :newStatus WHERE v.driver.userId = :userId AND v.status = :oldStatus")
    int updateStatusByDriverUserId(
            @Param("userId") UUID userId,
            @Param("oldStatus") VerificationStatus oldStatus,
            @Param("newStatus") VerificationStatus newStatus
    );
}
