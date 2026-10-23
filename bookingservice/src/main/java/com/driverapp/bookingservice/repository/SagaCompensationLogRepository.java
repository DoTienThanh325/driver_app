package com.driverapp.bookingservice.repository;

import com.driverapp.bookingservice.models.SagaCompensationLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SagaCompensationLogRepository extends MongoRepository<SagaCompensationLog, String> {
    List<SagaCompensationLog> findByEntityId(String entityId);
    List<SagaCompensationLog> findByResult(String result);
}
