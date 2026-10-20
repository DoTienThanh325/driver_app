package com.driverapp.paymentservice.repository;

import com.driverapp.paymentservice.models.ProcessedEvent;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProcessedEventRepository extends MongoRepository<ProcessedEvent, String> {
}
