package com.driverapp.driverservice.repository;

import com.driverapp.driverservice.models.DriverDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DriverDocumentRepository extends JpaRepository<DriverDocument, UUID> {
}
