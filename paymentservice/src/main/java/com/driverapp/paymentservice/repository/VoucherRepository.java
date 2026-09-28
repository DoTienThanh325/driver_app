package com.driverapp.paymentservice.repository;

import com.driverapp.paymentservice.models.Voucher;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface VoucherRepository extends MongoRepository<Voucher, UUID> {
}