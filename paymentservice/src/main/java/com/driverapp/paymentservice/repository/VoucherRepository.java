package com.driverapp.paymentservice.repository;

import com.driverapp.paymentservice.models.Voucher;
import com.driverapp.paymentservice.models.enums.VoucherProviderType;
import com.driverapp.paymentservice.models.enums.VoucherType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VoucherRepository extends MongoRepository<Voucher, String> {

    /** Lấy voucher của App còn hạn */
    List<Voucher> findByProviderTypeAndExpiredAtAfter(
            VoucherProviderType providerType, LocalDateTime now);

    /** Lấy voucher của App theo loại (FOOD/TRANSIT) và còn hạn */
    List<Voucher> findByProviderTypeAndTypeAndExpiredAtAfter(
            VoucherProviderType providerType, VoucherType type, LocalDateTime now);

    /** Lấy voucher của một Nhà hàng cụ thể còn hạn */
    List<Voucher> findByProviderTypeAndRestaurantIdAndExpiredAtAfter(
            VoucherProviderType providerType, String restaurantId, LocalDateTime now);
}