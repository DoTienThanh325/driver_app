package com.driverapp.driverservice.repository;

import com.driverapp.driverservice.models.SagaCompensationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SagaCompensationLogRepository extends JpaRepository<SagaCompensationLog, Long> {
}
