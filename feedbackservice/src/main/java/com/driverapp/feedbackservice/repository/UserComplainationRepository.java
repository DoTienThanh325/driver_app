package com.driverapp.feedbackservice.repository;

import com.driverapp.feedbackservice.models.UserComplaination;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserComplainationRepository extends JpaRepository<UserComplaination, UUID> {
}
