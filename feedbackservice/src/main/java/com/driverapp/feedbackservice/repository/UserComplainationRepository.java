package com.driverapp.feedbackservice.repository;

import com.driverapp.feedbackservice.models.UserComplaination;
import com.driverapp.feedbackservice.models.enums.ComplainationStatus;
import com.driverapp.feedbackservice.models.enums.ReportType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserComplainationRepository extends JpaRepository<UserComplaination, UUID> {
    Page<UserComplaination> findByStatus(ComplainationStatus status, Pageable pageable);

    Page<UserComplaination> findByStatusAndReportType(
            ComplainationStatus status,
            ReportType reportType,
            Pageable pageable);
}
