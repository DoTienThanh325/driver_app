package com.driverapp.driverservice.repository;

import com.driverapp.driverservice.models.Driver;
import com.driverapp.driverservice.models.DriverDocument;
import com.driverapp.driverservice.models.enums.DocumentType;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DriverDocumentRepository extends JpaRepository<DriverDocument, UUID> {
    boolean existsByDriverAndDocumentType(Driver driver, DocumentType documentType);
}
