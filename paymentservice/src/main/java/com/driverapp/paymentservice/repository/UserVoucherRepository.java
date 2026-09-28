package com.driverapp.paymentservice.repository;

import com.driverapp.paymentservice.models.UserVoucher;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserVoucherRepository extends MongoRepository<UserVoucher, UUID> {
}